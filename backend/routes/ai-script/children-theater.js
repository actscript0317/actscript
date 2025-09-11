const express = require('express');
const OpenAI = require('openai');
const config = require('../../config/env');
const { supabase, supabaseAdmin, safeQuery } = require('../../config/supabase');
const { authenticateToken } = require('../../middleware/supabaseAuth');
const { reserveUsage, commitUsage, rollbackUsage } = require('../../helpers/usage');
const { parseOpenAIError, callOpenAIWithRetry, logRequestData, MODEL_FINAL, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../../helpers/aiHelpers');
const { extractTitleFromScript, saveScript } = require('../../helpers/scriptHelpers');

const router = express.Router();

// OpenAI 클라이언트 초기화
let openai = null;

if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
} else {
  console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다. AI 기능이 비활성화됩니다.');
}

// 어린이 연극 전용 스크립트 저장 함수 (구 버전에서 통합)
async function saveChildrenScript(userId, scriptContent, metadata = {}) {
  const extractedTitle = extractTitleFromScript(scriptContent);
  const title = metadata.title || extractedTitle || '어린이 연극 대본';
  
  // ai_scripts 테이블 구조에 맞게 데이터 구성
  const aiScriptData = {
    user_id: userId,
    title: title,
    content: scriptContent,
    character_count: parseInt(metadata.characterCount) || 1,
    situation: '어린이 연극용 대본',
    emotions: [`어린이 연극 - ${metadata.theme || '동물 친구들'}`],
    gender: '전체',
    mood: metadata.theme || '동물 친구들',
    duration: metadata.length === 'short' ? '1~3분' : metadata.length === 'medium' ? '3~5분' : '5분 이상',
    age_group: '어린이',
    purpose: '연극',
    script_type: metadata.characterCount > 1 ? '대화' : '독백',
    generation_params: {
      template: 'children',
      theme: metadata.theme,
      originalGenre: `어린이 연극 - ${metadata.theme}`,
      originalLength: metadata.length,
      originalAge: 'children',
      originalGender: 'random',
      model: "gpt-5",
      generateTime: new Date(),
      isCustom: false
    },
    is_public: false,
    created_at: new Date().toISOString()
  };

  console.log('💾 어린이 연극 스크립트 저장 중...');
  const saveResult = await safeQuery(async () => {
    return await supabaseAdmin.from('ai_scripts').insert([aiScriptData]).select().single();
  }, '어린이 연극 스크립트 저장');

  if (!saveResult.success) {
    console.error('❌ 어린이 연극 스크립트 저장 실패:', saveResult.error);
    throw new Error('어린이 연극 스크립트 저장에 실패했습니다.');
  }

  console.log('✅ 어린이 연극 스크립트 저장 완료');
  return saveResult.data;
}

// 어린이 연극용 대본 대사 줄 수 검증 함수
function validateChildrenScriptDialogueLines(script, expectedLines) {
  try {
    const scriptSection = script.split('===대본===')[1];
    if (!scriptSection) {
      return { isValid: false, actualLines: {}, error: '대본 섹션을 찾을 수 없습니다.' };
    }

    const actualLines = {};
    const lines = scriptSection.split('\n');
    let currentCharacter = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine || 
          trimmedLine.startsWith('===') || 
          trimmedLine.startsWith('**') ||
          trimmedLine.startsWith('[') ||
          trimmedLine.startsWith('(')) {
        continue;
      }
      
      const characterMatch = trimmedLine.match(/^([^:]+):\s*(.+)$/);
      if (characterMatch) {
        currentCharacter = characterMatch[1].trim();
        const dialogue = characterMatch[2].trim();
        
        if (dialogue && !dialogue.startsWith('[') && !dialogue.startsWith('(')) {
          actualLines[currentCharacter] = (actualLines[currentCharacter] || 0) + 1;
        }
      } else if (currentCharacter && trimmedLine && 
                !trimmedLine.startsWith('[') && 
                !trimmedLine.startsWith('(') &&
                !trimmedLine.includes('===')) {
        actualLines[currentCharacter] = (actualLines[currentCharacter] || 0) + 1;
      }
    }
    
    let isValid = true;
    const discrepancies = [];
    
    for (const [character, expected] of Object.entries(expectedLines)) {
      const actual = actualLines[character] || 0;
      if (actual !== expected) { // 정확히 일치해야 함
        isValid = false;
        discrepancies.push(`${character}: 예상 ${expected}줄, 실제 ${actual}줄`);
      }
    }
    
    return {
      isValid,
      actualLines,
      expectedLines,
      discrepancies
    };
    
  } catch (error) {
    console.error('어린이 연극 대본 검증 중 오류:', error);
    return { isValid: false, actualLines: {}, error: error.message };
  }
}

// 어린이 연극 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 어린이 연극 대본 생성 요청 시작');
    logRequestData(req);
    
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    // 사용량 예약
    let usageInfo;
    try {
      usageInfo = await reserveUsage(req.user.id);
    } catch (error) {
      if (error.statusCode === 429) {
        return res.status(429).json({
          error: error.message,
          message: `이번 달 사용량 한도(${error.details.limit}회)를 초과했습니다. 프리미엄 플랜을 고려해보세요.`,
          ...error.details
        });
      }
      throw error;
    }

    const { 
      characterCount, 
      length, 
      characters,
      template,
      theme,
      themePrompt
    } = req.body;

    // 어린이 연극 템플릿 검증 (themePrompt는 백엔드에서 생성)
    if (template !== 'children' || !theme) {
      return res.status(400).json({
        error: '어린이 연극 템플릿에 필요한 필드를 입력해주세요.',
        required: ['template: children', 'theme']
      });
    }

    if (!characterCount || !length) {
      return res.status(400).json({
        error: '어린이 연극 템플릿에 필요한 필드를 입력해주세요.',
        required: ['characterCount', 'length']
      });
    }

    // 등장인물 검증
    if (parseInt(characterCount) > 1 && (!characters || !Array.isArray(characters))) {
      return res.status(400).json({
        error: '등장인물이 2명 이상일 때는 각 인물의 설정이 필요합니다.',
        required: ['characters']
      });
    }

    // 어린이 연극용 대본 길이별 총 대사 줄 수 (더 짧게 설정)
    const totalDialogueLines = {
      short: 12,   // 어린이용 짧은 대본 (약 1~2분)
      medium: 25,  // 어린이용 중간 대본 (약 3~5분)
      long: 50     // 어린이용 긴 대본 (약 5~8분)
    };

    const totalLines = totalDialogueLines[length] || totalDialogueLines.medium;

    // 등장인물별 대사 분량 계산
    let characterDialogueLines = {};
    
    if (parseInt(characterCount) === 1) {
      const mainCharacter = characters && characters[0] ? characters[0].name : '주인공';
      characterDialogueLines[mainCharacter] = totalLines;
    } else {
      let remainingLines = totalLines;
      const sortedCharacters = [...characters].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      
      for (let i = 0; i < sortedCharacters.length; i++) {
        const character = sortedCharacters[i];
        const ratio = character.percentage || (100 / characters.length);
        
        let assignedLines;
        if (i === sortedCharacters.length - 1) {
          assignedLines = remainingLines;
        } else {
          assignedLines = Math.round(totalLines * (ratio / 100));
          assignedLines = Math.max(1, assignedLines);
        }
        
        characterDialogueLines[character.name] = assignedLines;
        remainingLines -= assignedLines;
      }
      
      if (remainingLines > 0) {
        const firstCharacter = sortedCharacters[0].name;
        characterDialogueLines[firstCharacter] += remainingLines;
      }
    }

    console.log('📊 어린이 연극 등장인물별 대사 분량:', characterDialogueLines);

    // 테마별 프롬프트 생성 함수
    const generateThemePrompt = (theme, characters, length) => {
      if (theme === 'animal-friends') {
        const animalList = characters?.map(char => `${char.name}(${char.animalType || '동물'})`).join(', ') || '동물 친구들';
        const animalDetails = characters?.map(char => 
          `- ${char.name}(${char.animalType || '동물'}): ${char.personality || '친근한'}, ${char.voiceStyle || '밝은 목소리'}, 역할: ${char.roleType || '조연'}`
        ).join('\n') || '';
        
        return `🎭 어린이 연극 "동물 친구들" 테마 대본 생성

🐾 등장 동물: ${animalList}
📝 대본 길이: ${length === 'short' ? '짧게 (1-2분)' : length === 'long' ? '길게 (5-8분)' : '중간 (3-5분)'}
🎯 연령대: 5-12세 어린이 대상

🌟 스토리 특성:
- 따뜻하고 우호적인 동물 공동체
- 서로 도우며 문제를 해결하는 협력적 스토리  
- 각 동물의 특성을 살린 개성 있는 대화
- 자연 속에서의 평화로운 일상
- 교훈: 다름을 인정하고 서로 도우며 살아가는 지혜

🐾 동물 캐릭터 상세:
${animalDetails}`;
      }
      return `어린이 연극 "${theme}" 테마의 교육적이고 재미있는 이야기`;
    };

    // 백엔드에서 테마 프롬프트 생성
    const generatedThemePrompt = generateThemePrompt(theme, characters, length);

    // 캐릭터별 지시사항 생성
    let characterDirectives = '';
    if (parseInt(characterCount) === 1) {
      const mainCharacterName = Object.keys(characterDialogueLines)[0];
      characterDirectives = `1인 독백: 어린이 (5~12세), 역할: 주연 (이야기의 핵심 주인공)
- 대사 분량: 약 ${characterDialogueLines[mainCharacterName]}줄의 대사`;
    } else if (characters && Array.isArray(characters)) {
      characterDirectives = characters.map((char, index) => {
        const roleType = char.roleType || '조연';
        const assignedLines = characterDialogueLines[char.name] || 0;
        const relationship = (char.relationshipWith && char.relationshipType) ? 
          `, ${char.relationshipWith}와(과) ${char.relationshipType} 관계` : '';
        
        return `인물 ${index + 1}: 이름 "${char.name}", 어린이 연극 캐릭터, 역할: ${roleType}${relationship}
- 동물 종류: ${char.animalType || '없음'}
- 성격: ${char.personality || '밝고 긍정적'}
- 말투 스타일: ${char.voiceStyle || '어린이다운'}
- 대사 분량: 약 ${assignedLines}줄의 대사`;
      }).join('\n\n');
    }

    // 어린이 연극 전용 프롬프트 생성 (제공받은 대본 스타일 적용)
    const prompt = `당신은 어린이 연극 대본을 전문적으로 쓰는 작가입니다.
아래 참고 대본 스타일을 정확히 따라 5~12세 어린이들이 연기할 수 있는 대본을 작성하세요.

**참고 대본 형식 (대본의 구조만 정확히 따라 작성, 내용 및 지시문은 변형해서 작성성):**

(숲속. 햇살이 비추고 새소리가 들린다. 동물들이 무대 중앙으로 모인다.)

토끼: 모두 모였어? 오늘 숲속 놀이터를 만들자.
강아지: 좋아! 내가 먼저 달려간다! (깡충깡충)
고양이: 잠깐, 계획부터 세워야 해. 돌은 무겁고, 나무는 길어.
여우: 맞아, 그냥 하면 다 엉망이 돼.
곰: (천천히 고개를 끄덕이며) 함께하면 쉽다. 혼자 하면 어렵다.

(동물들이 서로 다른 방향으로 달려간다. 금방 지쳐 돌아온다.)

**스타일 분석 및 적용 지침:**
1. **무대 지시문**: 괄호 안에 간결하게 (예: (숲속. 햇살이 비추고...), (깡충깡충))
2. **대사 구조**: "캐릭터명: 대사" 형식, 한 줄에 하나의 완결된 대사
3. **캐릭터별 말투 차별화**:
   - 주도적 캐릭터: "모두 모였어?", "~하자"
   - 활발한 캐릭터: "좋아!", "내가 먼저!"
   - 신중한 캐릭터: "잠깐, ~해야 해", "~은 ~고, ~는 ~"
   - 동조하는 캐릭터: "맞아", "그래서 ~"
   - 침착한 캐릭터: 짧고 명확한 문장, 철학적 표현
4. **대사 줄 띄움**: 캐릭터가 바뀔 때마다 줄 바꿈, 장면 전환 시 한 줄 공백
5. **마지막 구호**: 모든 캐릭터가 함께 외치는 3줄 구호로 마무리
6. 한 대사의 어절은 6~12어절로 제한한

**생성할 대본 조건:**
- 테마: ${theme}
- 인원: ${characterCount}명
- 길이: ${length}
- 총 대사 분량: 약 ${totalLines}줄
- 등장인물: ${characterDirectives}

**필수 요소:**
1. 교육적 메시지 (협동, 우정, 배려 등)
2. 각 캐릭터별 개성 있는 말투
3. 아이들이 따라할 수 있는 간단한 동작
4. 마지막에 모든 캐릭터가 함께 부르는 [노래/구호] 섹션

**대본 작성 형식 (정확히 이 구조로):**

(무대 설정. 상황 설명을 괄호 안에 간단히.)

캐릭터1: 첫 번째 대사.
캐릭터2: 두 번째 대사. (간단한 동작)
캐릭터3: 세 번째 대사.

(장면 전환이나 중요한 무대 지시문)

캐릭터들의 대화가 자연스럽게 이어짐...

[노래/구호]

(모든 캐릭터가 손을 잡고 원을 그리며 외친다.)
모두:
"첫 번째 구호 문장!
두 번째 구호 문장!
세 번째 구호 문장!"

**⚠️ 절대 준수사항 - 캐릭터별 대사 분량:**
${Object.entries(characterDialogueLines).map(([name, lines]) => 
  `- ${name}: 정확히 ${lines}줄의 대사 (1줄도 틀리면 안됨)`
).join('\n')}

**대사 분량 확인 방법:**
- 각 캐릭터의 대사를 셀 때는 "캐릭터명: 대사내용" 형식으로 된 줄만 계산
- 무대 지시문 (괄호), 빈 줄, [노래/구호] 섹션은 대사 수에 포함되지 않음
- 한 캐릭터가 연속으로 말하는 경우 각 줄을 별도로 계산
- 예시: 
  토끼: 첫 번째 대사 (1줄)
  토끼: 두 번째 대사 (2줄)

**작성 시 주의사항:**
- 제공된 참고 대본과 동일한 스타일과 구조 사용
- 무대 지시문은 괄호 안에 간결하게
- 각 캐릭터마다 고유한 말투와 성격 반영
- 총 대사 줄 수: 정확히 ${totalLines}줄 (오차 허용 안함)
- 마지막에 반드시 [노래/구호] 섹션 포함
- 교육적 메시지와 협동의 가치 전달

**최종 검토 필수:**
대본 작성 완료 후 각 캐릭터의 대사를 다시 세어보고 지정된 분량과 정확히 일치하는지 확인하세요.`;

    // RAG 기능 제거 - 원본 프롬프트 직접 사용
    console.log('🎭 어린이 연극 프롬프트 준비 완료');

    // OpenAI API 호출 (대사 분량 검증과 함께 최대 2회 시도)
    console.log('🚀 어린이 연극 대본 OpenAI API 호출 시작');
    
    let generatedScript = null;
    let validation = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`📝 대본 생성 시도 ${attempt}/2`);
      
      const completion = await callOpenAIWithRetry(openai, [
        {
          role: "system",
          content: `당신은 어린이 연극 전문 대본 작가입니다. 

⚠️ 중요: 각 캐릭터별 대사 분량을 정확히 지켜야 합니다.
${Object.entries(characterDialogueLines).map(([name, lines]) => 
  `- ${name}: 정확히 ${lines}줄의 대사`
).join('\n')}

대사 분량 계산 규칙:
1. "캐릭터명: 대사내용" 형식의 줄만 계산
2. 무대 지시문 (괄호), 빈 줄, [노래/구호]는 대사 수에 미포함
3. 연속 대사도 각 줄을 별도 계산

제공된 참고 대본 스타일을 정확히 따라 작성하세요:
- 무대 지시문: (괄호 안에 간결하게)
- 대사 형식: "캐릭터명: 대사" 
- 줄 띄움: 캐릭터별로 줄 바꿈, 장면 전환 시 한 줄 공백
- 마지막: [노래/구호] 섹션으로 마무리

각 캐릭터마다 고유한 말투와 성격을 부여하고, 협동과 우정의 교육적 메시지를 자연스럽게 전달하세요.

작성 완료 후 반드시 각 캐릭터의 대사 수를 다시 확인하여 정확히 일치하는지 검토하세요.${attempt > 1 ? '\n\n⚠️ 이전 시도에서 대사 분량이 맞지 않았습니다. 이번에는 반드시 정확한 분량으로 작성해주세요.' : ''}`
        },
        {
          role: "user",
          content: prompt
        }
      ], {
        model: MODEL_FINAL,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        temperature: TEMPERATURE_FINAL
      });
      
      generatedScript = completion.choices[0].message.content;
      
      // 대본 검증
      validation = validateChildrenScriptDialogueLines(generatedScript, characterDialogueLines);
      
      if (validation.isValid) {
        console.log(`✅ 시도 ${attempt}: 어린이 연극 대본 분량 검증 성공`);
        console.log('📊 검증 결과:', validation.actualLines);
        break;
      } else {
        console.log(`⚠️  시도 ${attempt}: 어린이 연극 대본 분량이 예상과 다름`);
        console.log('📊 예상 줄 수:', characterDialogueLines);
        console.log('📊 실제 줄 수:', validation.actualLines);
        if (validation.discrepancies) {
          console.log('🔍 불일치 상세:', validation.discrepancies);
        }
        
        if (attempt < 2) {
          console.log('🔄 대본 생성을 다시 시도합니다...');
        } else {
          console.log('⚠️  2회 시도 모두 실패. 현재 대본으로 진행합니다.');
        }
      }
    }

    console.log('✅ 어린이 연극 OpenAI API 응답 완료');

    // 제목 추출
    const extractedTitle = extractTitleFromScript(generatedScript);
    const title = extractedTitle || `${theme} 어린이 연극`;

    // 스크립트 저장 (전용 함수와 기본 함수 중 선택)
    console.log('💾 어린이 연극 대본 Supabase에 저장 시작');
    let savedScript;
    
    try {
      // 어린이 연극 전용 저장 함수 사용
      savedScript = await saveChildrenScript(req.user.id, generatedScript, {
        title: title,
        theme: theme,
        characterCount: parseInt(characterCount) || 1,
        length: length
      });
    } catch (error) {
      // 전용 함수 실패 시 기본 함수 사용
      console.log('⚠️ 전용 저장 함수 실패, 기본 함수로 저장 시도');
      savedScript = await saveScript(req.user.id, generatedScript, {
        title: title,
        genre: '어린이 연극',
        characterCount: parseInt(characterCount) || 1,
        length: length,
        gender: 'random',
        age: 'children',
        isCustom: false,
        theme: theme,
        template: 'children'
      });
    }

    // 생성 성공 시 사용량 커밋
    await commitUsage(req.user.id);

    console.log('✅ 어린이 연극 대본 Supabase 저장 완료, ID:', savedScript.id);

    res.json({
      success: true,
      script: {
        id: savedScript.id,
        title: title,
        content: generatedScript,
        characterCount: parseInt(characterCount),
        genre: '어린이 연극',
        length: length,
        gender: 'random',
        age: 'children',
        theme: theme,
        createdAt: new Date().toISOString()
      },
      metadata: {
        characterCount,
        theme,
        template: 'children',
        length: `${length} (어린이용)`,
        generatedAt: new Date().toISOString()
      },
      finalPrompt: prompt
    });

  } catch (error) {
    console.error('❌ 어린이 연극 대본 생성 오류 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.type,
      status: error.status,
      response: error.response?.data
    });
    
    // 에러 발생 시 사용량 롤백
    await rollbackUsage();
    
    // 공통 에러 핸들러 사용
    const parsed = parseOpenAIError(error);
    return res.status(parsed.http).json({
      error: parsed.code,
      message: parsed.msg,
      ...(process.env.NODE_ENV !== 'production' && { 
        debug: error.message 
      })
    });
  }
});

module.exports = router;