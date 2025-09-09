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
      model: "gpt-4o",
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
    for (const [character, expected] of Object.entries(expectedLines)) {
      const actual = actualLines[character] || 0;
      if (Math.abs(actual - expected) > 2) { // 어린이 연극은 ±2줄 허용
        isValid = false;
      }
    }
    
    return {
      isValid,
      actualLines,
      expectedLines
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

    // 어린이 연극 전용 프롬프트 생성
    const prompt = `당신은 어린이 연극 대본을 전문적으로 쓰는 작가입니다.
다음 조건에 맞춰 5~12세 어린이들이 연기할 수 있는 교육적이고 재미있는 연극 대본을 완성하세요.

**테마 요청:**
${generatedThemePrompt}

**어린이 연극 기본 조건:**
- 총 대사 분량: 약 ${totalLines}줄 (지시문 제외, 순수 대사만)
- 인원: ${characterCount}명
- 테마: ${theme}
- 길이: ${length} (어린이 집중력 고려)
- 등장인물별 정확한 분량:
${characterDirectives}

**어린이 연극 작성 지침:**
1. 언어 스타일:
   - 대사는 아이들이 발음하기 좋은 어절로 작성해주세요.
   - 발음하기 좋은 어절의 기준:
     - 한 대사당 6~12 어절
     - 쉬운 단어 위주 (초등학교 1~2학년 수준 단어)
     - 모음 발음이 뚜렷한 단어 사용 (예: 나무, 친구, 밝다, 웃다)
     - 같은 패턴이나 반복되는 구절을 포함 (예: "우리는 친구야!", "같이 하자!")

  2. **연기 고려사항**
   - 어린이가 실제로 할 수 있는 동작과 표정 지시
   - 과도한 감정 표현보다는 자연스러운 반응
   - 간단한 소품이나 의상으로 표현 가능한 설정

  3. **교육적 가치**
   - 폭력적이거나 무서운 내용 완전 배제
   - 긍정적 가치관 전달 (우정, 나눔, 용기, 정직)
   - 다양성과 포용의 가치 포함

  4. 공연 요소:
   - 아이들이 함께 부를 수 있는 짧은 노래나 구호를 2개 넣어주세요.
   - 노래/구호는 한 줄당 5~8 어절로 반복 가능하게 해주세요.
   - 무대에서 쉽게 표현할 수 있는 동작 지시를 포함해주세요. (박수, 뛰기, 손 흔들기, 원을 그리며 돌기 등)

  5. **캐릭터 일관성**
   - 각 캐릭터의 성격과 특성을 일관되게 유지
   - 동물 캐릭터의 경우 해당 동물의 특징을 자연스럽게 반영

  6. 구조:
   - [무대 지시문]은 괄호 안에 간단히 작성해주세요. (예: (숲속에서 동물들이 모인다), (모두 함께 노래한다))
   - 대사는 반드시 "등장인물 이름: 대사" 형식으로 써주세요.
   - 이야기 전개는 다음 단계를 따라주세요:
     - 도입 (등장인물 소개, 배경 설정)
     - 갈등/문제 (작은 도전이나 오해 발생)
     - 해결 (협동, 친절, 용기로 극복)
     - 해피엔딩

**대본 생성 형식:**
다음 형식을 정확히 따라 작성하세요.

어린이 연극 제목

===상황 설명===
어떤 상황에서 어떤 이야기가 펼쳐지는지 어린이도 이해할 수 있게 3-4줄로 설명

===등장인물===
${parseInt(characterCount) === 1 ? 
  `이름: [어린이다운 이름]
나이: 어린이 (5~12세)
역할: 주연
성격: [밝고 긍정적인 성격과 현재 상황]` :
  `${characters && characters.map((char, index) => 
    `인물 ${index + 1}: ${char.name}
${char.animalType ? `동물: ${char.animalType}` : '나이: 어린이 (5~12세)'}
역할: ${char.roleType || '조연'}
성격: ${char.personality || '밝고 긍정적'} - ${char.voiceStyle || '어린이다운 말투'}`
  ).join('\n\n')}`
}

===대본===
${parseInt(characterCount) === 1 ? 
  `${Object.keys(characterDialogueLines)[0]}: [약 ${Object.values(characterDialogueLines)[0]}줄의 대사 작성]` :
  `각 인물별로 지정된 대사 줄 수에 맞춰 대화 형식으로 작성:
${characters && characters.map((char, index) => 
  `${char.name}: [약 ${characterDialogueLines[char.name] || 0}줄의 대사 담당]`
).join('\n')}

**절대 규칙**: 
- 총 대사 줄 수: 약 ${totalLines}줄 (±2줄 허용)
- 교육적 가치와 안전성 최우선
- 어린이 연기 난이도 고려`
}

===연기 팁===
[어린이들을 위한 감정 표현과 호흡 지침]

**중요**: 어린이의 안전과 교육적 가치를 최우선으로 하되, 재미있고 참여도 높은 연극으로 작성하세요.`;

    // RAG 기능 제거 - 원본 프롬프트 직접 사용
    console.log('🎭 어린이 연극 프롬프트 준비 완료');

    // OpenAI API 호출 (단일 시도)
    console.log('🚀 어린이 연극 대본 OpenAI API 호출 시작');
    
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: `당신은 어린이 연극 전문 대본 작가입니다. 다음 원칙을 따라 안전하고 교육적인 어린이 연극 대본을 작성하세요:


대본은 반드시 한국어로 작성하며, 어린이 연극 형식을 따르세요.`
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
    
    const generatedScript = completion.choices[0].message.content;
    
    // 대본 검증 (참고용, 어린이 연극은 유연하게)
    const validation = validateChildrenScriptDialogueLines(generatedScript, characterDialogueLines);
    
    if (validation.isValid) {
      console.log('✅ 어린이 연극 대본 분량 검증 성공');
      console.log('📊 검증 결과:', validation.actualLines);
    } else {
      console.log('⚠️  어린이 연극 대본 분량이 예상과 다름 (교육적 가치를 위해 그대로 진행)');
      console.log('📊 예상 줄 수:', characterDialogueLines);
      console.log('📊 실제 줄 수:', validation.actualLines);
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