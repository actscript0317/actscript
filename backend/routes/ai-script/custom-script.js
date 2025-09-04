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

// 커스텀 프롬프트 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 커스텀 대본 생성 요청 시작');
    logRequestData(req);
    
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ OpenAI 클라이언트 초기화 완료');
    
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
      genre, 
      length, 
      gender, 
      age, 
      characters,
      customPrompt
    } = req.body;

    // 커스텀 프롬프트 검증
    if (!customPrompt || !customPrompt.trim()) {
      return res.status(400).json({
        error: '커스텀 프롬프트를 입력해주세요.',
        required: ['customPrompt']
      });
    }

    // 기본 필드 검증
    if (!characterCount || !length) {
      return res.status(400).json({
        error: '캐릭터 수와 대본 길이를 입력해주세요.',
        required: ['characterCount', 'length']
      });
    }

    // 멀티 캐릭터 모드일 때 characters 배열 검증
    if (parseInt(characterCount) > 1 && (!characters || !Array.isArray(characters))) {
      return res.status(400).json({
        error: '등장인물이 2명 이상일 때는 각 인물의 설정이 필요합니다.',
        required: ['characters']
      });
    }

    // 커스텀 대본 길이별 총 대사 줄 수
    const totalDialogueLines = {
      short: 20,   // 커스텀 짧은 대본
      medium: 40,  // 커스텀 중간 대본
      long: 80     // 커스텀 긴 대본
    };

    const totalLines = totalDialogueLines[length] || totalDialogueLines.medium;

    // 성별 처리
    const genderMap = {
      'male': '남성',
      'female': '여성',
      'random': '성별 자유롭게'
    };
    
    const genderText = genderMap[gender] || '성별 자유롭게';

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

    console.log('📊 커스텀 대본 등장인물별 대사 분량:', characterDialogueLines);

    // 나이별 설정
    const ageMap = {
      'children': '어린이 (5~9세)',
      'kids': '초등학생 (10~12세)',
      'teens': '10대',
      '20s': '20대', 
      '30s-40s': '30~40대',
      '50s': '50대',
      '70s+': '70대 이상',
      'random': '연령대 자유롭게'
    };
    
    const ageText = ageMap[age] || '연령대 자유롭게';

    // 캐릭터별 지시사항 생성
    let characterDirectives = '';
    if (parseInt(characterCount) === 1) {
      const mainCharacterName = Object.keys(characterDialogueLines)[0];
      characterDirectives = `1인 독백: ${genderText}, ${ageText}, 역할: 주연 (이야기의 핵심 주인공)
- 대사 분량: 약 ${characterDialogueLines[mainCharacterName]}줄의 대사`;
    } else if (characters && Array.isArray(characters)) {
      characterDirectives = characters.map((char, index) => {
        const charGender = char.gender === 'male' ? '남성' : char.gender === 'female' ? '여성' : '성별 자유롭게';
        const charAge = ageMap[char.age] || char.age || ageText;
        const roleType = char.roleType || '조연';
        const assignedLines = characterDialogueLines[char.name] || 0;
        const relationship = (char.relationshipWith && char.relationshipType) ? 
          `, ${char.relationshipWith}와(과) ${char.relationshipType} 관계` : '';
        
        return `인물 ${index + 1}: 이름 "${char.name}", ${charGender}, ${charAge}, 역할: ${roleType}${relationship}
- 대사 분량: 약 ${assignedLines}줄의 대사 (다른 인물과 교대로 대화하되 총 ${assignedLines}줄을 담당)`;
      }).join('\n\n');
    }

    // 인물 태그 처리 (예: /김철수 -> 김철수)
    let processedPrompt = customPrompt;
    if (characters && Array.isArray(characters)) {
      characters.forEach(char => {
        const tagRegex = new RegExp(`\\/${char.name}(?=\\s|$)`, 'g');
        processedPrompt = processedPrompt.replace(tagRegex, char.name);
      });
    }

    // 커스텀 프롬프트 생성
    const prompt = `당신은 한국 드라마, 영화, 연극의 대본을 전문적으로 쓰는 작가입니다.
다음 사용자의 요청에 따라 실제로 한국의 드라마, 영화, 연기 입시에 쓰일 수 있는 퀄리티 높은 대본을 완성하세요.

**사용자 요청:**
${processedPrompt}

**대본 생성 기본 조건:**
 - 총 대사 분량: 약 ${totalLines}줄 (지시문 제외, 순수 대사만)
 - 인원: ${characterCount}명
 - 등장인물별 정확한 분량:
${characterDirectives}

**3. 대본 작성 지침**
 - 문어체, 시적 표현, 과장된 멜로 어투 금지. 
 - 100% 구어체, 실제 대화에서 들을 수 있는 말투 사용.
 - 비유·추상 표현 최소화, 생활어 중심.
 - 상대방을 직접 지칭하는 2인칭 대사 활용 ("너", "당신").
 - 감정은 '점진적으로' 쌓이며 후반에 폭발 또는 체념.
 - 중간에 감정을 급격히 변화시키는 촉발 장면이나 대사 배치.
 - 감정이 무거운 장면에서는 가볍거나 유행어 같은 표현은 피하고, 상황에 맞게 진지하고 일관된 톤을 유지하기.
 - 인물이 현실에서 한국어로 말할 때 쓰는 자연스러운 말투만 사용하기.
 - 마지막 대사는 감정이 남도록 구성.
 - 대본과 상황을 정확하게 일치할 것. 예: 누군가에게 고백하는 장면이라면 그 대상 앞에서 말하는 대사, 지시문, 상황을 일치시킬 것.
 - 대사는 자연스럽고 간결하게, 너무 '대본틱'하지 않게.
 - 짧은 문장과 긴 문장을 섞어 리듬을 만든다.
 
**🎭 무대 지시문 작성 원칙:**
 - 모든 대사에는 배우들이 연습할 수 있는 현실적이고 구체적인 무대 지시문을 포함하세요.
 - 지시문은 괄호 () 안에 작성하며, 감정, 몸짓, 시선, 톤, 행동을 명확히 명시하세요.
 - 예: "안녕하세요." → "안녕하세요. (조심스럽게 고개를 숙이며, 눈을 마주치지 못하고)"
 - 예: "그만해!" → "그만해! (주먹을 불끈 쥐고, 목소리를 떨며 격하게)"
 - 지시문은 연기자가 실제로 실행할 수 있는 구체적인 동작과 감정 표현이어야 함.
 - 추상적인 지시문(마음속으로, 깊이 생각하며 등) 금지. 반드시 외적으로 드러나는 행동과 표정으로 표현.
 
**대본 생성 형식:**
다음 형식을 정확히 따라 작성하세요.

감정이나 상황을 압축한 제목

===상황 설명===
어떤 상황에서 누구에게 하는 말인지, 왜 이런 감정 상태인지 3-4줄로 설명

===등장인물===
${parseInt(characterCount) === 1 ? 
  ` 이름: [실제 한국 이름]
 나이: [해당 연령대]
 역할: 주연 (이야기의 핵심 주인공)
 성격: [간략한 성격과 현재 상황]` :
  `${characters && characters.map((char, index) => 
    ` 인물 ${index + 1}: ${char.name}
 나이: ${ageMap[char.age] || char.age || ageText}
 역할: ${char.roleType || '조연'}
 성격: [간략한 성격과 현재 상황, 역할 유형에 맞는 특성 반영]`
  ).join('\n\n')}`
}

===대본===
${parseInt(characterCount) === 1 ? 
  `${Object.keys(characterDialogueLines)[0]}: [약 ${Object.values(characterDialogueLines)[0]}줄의 대사 작성]
같은 인물의 대사라면 인물명 작성은 생략한다.` :
  `각 인물별로 정확히 지정된 대사 줄 수에 맞춰 작성:
${characters && characters.map((char, index) => 
  `${char.name}: [약 ${characterDialogueLines[char.name] || 0}줄의 대사 담당]`
).join('\n')}`
}

===연기 팁===
[감정 흐름과 호흡 지침]

**중요**: 사용자의 요청을 최우선으로 하되, 자연스럽고 연기하기 좋은 대본으로 작성하세요.`;

    // RAG 기반 프롬프트 향상 (커스텀 모드)
    console.log('🔍 커스텀 모드 RAG 기반 참고 청크 검색 중...');
    const customRagCriteria = {
      genre: genre || '드라마',
      ageGroup: age || '20s',
      gender: gender || 'random',
      characterCount: parseInt(characterCount),
      mood: '일반' // 커스텀 모드는 일반적인 mood 사용
    };
    
    const enhancedCustomPrompt = await enhancePromptWithRAG(prompt, customRagCriteria);

    // OpenAI API 호출
    console.log('🚀 커스텀 대본 OpenAI API 호출 시작');
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: `당신은 전문적인 한국 대본 작가입니다. 다음 원칙을 따라 고품질 연기용 대본을 작성하세요:

1. **사용자 요청 최우선**: 사용자의 커스텀 프롬프트 내용을 정확히 반영하세요.
2. **자연스러운 대사**: 한국어 구어체로 자연스럽고 연기 가능한 대화를 작성하세요.
3. **구체적 지시문**: 배우가 실제로 연기할 수 있는 현실적인 무대 지시문을 포함하세요.

대본은 반드시 한국어로 작성하며, 표준 대본 형식을 따르세요.`
      },
      {
        role: "user",
        content: enhancedCustomPrompt
      }
    ], {
      model: MODEL_FINAL,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: TEMPERATURE_FINAL
    });

    const generatedScript = completion.choices[0].message.content;
    const extractedTitle = extractTitleFromScript(generatedScript);
    const title = extractedTitle || `${genre || '사용자 지정'} 대본`;

    // 스크립트 저장
    console.log('💾 커스텀 대본 Supabase에 저장 시작');
    const savedScript = await saveScript(req.user.id, generatedScript, {
      title: title,
      genre: genre || '사용자 지정',
      characterCount: parseInt(characterCount) || 1,
      length: length,
      gender: gender || 'random',
      age: age || 'random',
      isCustom: true,
      prompt: customPrompt
    });

    // 생성 성공 시 사용량 커밋
    await commitUsage(req.user.id);

    console.log('✅ 커스텀 대본 Supabase 저장 완료, ID:', savedScript.id);

    res.json({
      success: true,
      script: {
        id: savedScript.id,
        title: title,
        content: generatedScript,
        characterCount: parseInt(characterCount),
        genre: genre || '사용자 지정',
        length: length,
        gender: gender || 'random',
        age: age || 'random',
        createdAt: new Date().toISOString()
      },
      metadata: {
        customPrompt: true,
        originalPrompt: customPrompt,
        generatedAt: new Date().toISOString()
      },
      finalPrompt: enhancedCustomPrompt
    });

  } catch (error) {
    console.error('❌ 커스텀 대본 생성 오류 상세:', {
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