const express = require('express');
const OpenAI = require('openai');
const config = require('../../config/env');
const { supabaseAdmin, safeQuery } = require('../../config/supabase');
const { authenticateToken } = require('../../middleware/supabaseAuth');
const { reserveUsage, commitUsage, rollbackUsage } = require('../../helpers/usage');
const { parseOpenAIError, callOpenAIWithRetry, logRequestData, MODEL_FINAL, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../../helpers/aiHelpers');
const { extractTitleFromScript, saveScript } = require('../../helpers/scriptHelpers');
const { enhancePromptWithRAG } = require('../../helpers/ragHelpers');

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

    // 어린이 연극 템플릿 검증
    if (template !== 'children' || !theme || !themePrompt) {
      return res.status(400).json({
        error: '어린이 연극 템플릿에 필요한 필드를 입력해주세요.',
        required: ['template: children', 'theme', 'themePrompt']
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

    // 캐릭터별 지시사항 생성 (스니펫 정보 포함)
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
        
        // 스니펫 정보 추가 (동물 캐릭터인 경우)
        let snippetInfo = '';
        if (char.snippet) {
          snippetInfo = `
📝 ${char.name} 전용 스니펫 (반드시 포함):
- 감탄사: ${char.snippet.exclamations?.join(', ') || '없음'}
- 행동 지시문: ${char.snippet.actions?.join(', ') || '없음'}
- 캐릭터 특성: ${char.snippet.characteristics || '없음'}
- 말투 패턴: ${char.snippet.speechPattern || '없음'}`;
        }
        
        return `인물 ${index + 1}: 이름 "${char.name}", 어린이 연극 캐릭터, 역할: ${roleType}${relationship}
- 동물 종류: ${char.animalType || '없음'}
- 성격: ${char.personality || '밝고 긍정적'}
- 말투 스타일: ${char.voiceStyle || '어린이다운'}
- 대사 분량: 약 ${assignedLines}줄의 대사${snippetInfo}`;
      }).join('\n\n');
    }

    // 어린이 연극 전용 프롬프트 생성
    const prompt = `당신은 어린이 연극 대본을 전문적으로 쓰는 작가입니다.
다음 조건에 맞춰 5~12세 어린이들이 연기할 수 있는 교육적이고 재미있는 연극 대본을 완성하세요.

**사용자 요청:**
${themePrompt}

**어린이 연극 기본 조건:**
- 총 대사 분량: 약 ${totalLines}줄 (지시문 제외, 순수 대사만)
- 인원: ${characterCount}명
- 테마: ${theme}
- 길이: ${length} (어린이 집중력 고려)
- 등장인물별 정확한 분량:
${characterDirectives}

**어린이 연극 작성 지침:**
1. **언어와 표현**
   - 5~12세가 이해할 수 있는 쉬운 단어 사용
   - 한 문장당 6~12어절로 제한
   - 어려운 한자어, 추상적 표현 최소화
   - 의성어, 의태어 적극 활용 ("쿵쿵", "반짝반짝" 등)

2. **스토리 구조** 
   - 시작: 일상적이고 평화로운 상황
   - 문제: 작은 오해나 쉬운 난관 (무섭지 않게)
   - 해결: 협력과 우정으로 문제 해결
   - 메시지: 명확한 교훈 전달 (나눔, 협력, 정직 등)

3. **연기 고려사항**
   - 어린이가 실제로 할 수 있는 동작과 표정 지시
   - 과도한 감정 표현보다는 자연스러운 반응
   - 간단한 소품이나 의상으로 표현 가능한 설정

4. **교육적 가치**
   - 폭력적이거나 무서운 내용 완전 배제
   - 긍정적 가치관 전달 (우정, 나눔, 용기, 정직)
   - 다양성과 포용의 가치 포함

5. **스니펫 활용 (동물 캐릭터의 경우)**
   - 각 동물의 전용 스니펫을 반드시 대본에 포함
   - 감탄사와 행동 지시문을 자연스럽게 녹여냄
   - 캐릭터 특성을 일관되게 유지

**무대 지시문 작성 원칙:**
- 어린이가 이해하고 실행할 수 있는 구체적 동작
- 감정보다는 행동 중심 지시문 (웃으며, 고개 끄덕이며 등)
- 안전한 동작만 포함 (달리기, 뛰기 등 주의)

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

    // RAG 기반 프롬프트 향상 (어린이 연극용 기준 적용)
    console.log('🔍 어린이 연극 RAG 기반 참고 청크 검색 중...');
    const ragCriteria = {
      genre: '어린이 연극',
      ageGroup: 'children',
      gender: 'random',
      characterCount: parseInt(characterCount),
      mood: theme
    };
    
    const enhancedPrompt = await enhancePromptWithRAG(prompt, ragCriteria);

    // OpenAI API 호출 (단일 시도)
    console.log('🚀 어린이 연극 대본 OpenAI API 호출 시작');
    
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: `당신은 어린이 연극 전문 대본 작가입니다. 다음 원칙을 따라 안전하고 교육적인 어린이 연극 대본을 작성하세요:

1. **안전성 최우선**: 어린이에게 해롭거나 무서운 내용 절대 금지
2. **교육적 가치**: 긍정적 가치관과 교훈 전달
3. **연기 가능성**: 어린이가 실제로 연기할 수 있는 수준
4. **재미와 참여**: 어린이와 관객 모두 즐길 수 있는 내용

대본은 반드시 한국어로 작성하며, 어린이 연극 형식을 따르세요.`
      },
      {
        role: "user",
        content: enhancedPrompt
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

    // 스크립트 저장
    console.log('💾 어린이 연극 대본 Supabase에 저장 시작');
    const savedScript = await saveScript(req.user.id, generatedScript, {
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
      finalPrompt: enhancedPrompt
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