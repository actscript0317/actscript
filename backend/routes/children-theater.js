const express = require('express');
const OpenAI = require('openai');
const config = require('../config/env');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const { reserveUsage, commitUsage, rollbackUsage } = require('../helpers/usage');
const { parseOpenAIError, callOpenAIWithRetry, MODEL_FINAL, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../helpers/aiHelpers');
const { extractTitleFromScript } = require('../helpers/scriptHelpers');
const { enhancePromptWithRAG } = require('../helpers/ragHelpers');

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

// 어린이 연극 전용 스크립트 저장 함수
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

// 어린이 연극 대본 생성 API - v1.3 (force deploy trigger)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 어린이 연극 대본 생성 요청 시작');
    
    // OpenAI API 키 확인
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
      length, 
      characters,
      theme,
      themePrompt
    } = req.body;

    // 입력값 검증
    if (!characterCount || !length || !theme || !themePrompt) {
      return res.status(400).json({
        error: '어린이 연극 템플릿에 필요한 필드를 입력해주세요.',
        required: ['characterCount', 'length', 'theme', 'themePrompt']
      });
    }

    // 멀티 캐릭터 모드일 때 characters 배열 검증
    if (parseInt(characterCount) > 1 && (!characters || !Array.isArray(characters))) {
      return res.status(400).json({
        error: '등장인물이 2명 이상일 때는 각 인물의 설정이 필요합니다.',
        required: ['characters']
      });
    }

    console.log(`🎭 어린이 연극 "${theme}" 테마 대본 생성 시작`);
    
    // 프롬프트 구성
    const prompt = `당신은 한국의 어린이 연극 대본을 전문적으로 쓰는 작가입니다.

${themePrompt}

위 지침에 따라 다음 조건으로 어린이 연극 대본을 작성해주세요:

**📋 출력 형식 (반드시 준수):**
===제목===
[테마에 맞는 매력적인 제목]

===상황 설명===
[어떤 상황에서 어떤 이야기가 펼쳐지는지 3-4줄로 설명]

===등장인물===
${characters && characters.map((char, index) => 
`이름: ${char.name}
동물: ${char.label || '동물'}
성격: ${char.personality}
목소리: ${char.voiceStyle}
역할: ${char.roleType}
분량: ${char.percentage}%`
).join('\n\n')}

===대본===
[각 동물 캐릭터의 성격과 목소리 특성을 살려서 자연스러운 대화 작성]
[대사 분량은 설정된 비율에 맞춰 정확히 조절]
[어린이가 이해하기 쉽고 재미있는 내용으로 구성]

**⚠️ 중요 사항:**
- 폭력적이거나 무서운 내용 금지
- 교육적이고 긍정적인 메시지 포함
- 각 동물의 특성을 잘 살린 개성 있는 대사
- 어린이가 따라 할 수 있는 적절한 언어 사용

**대본 길이:** ${length === 'short' ? '짧은 대본 (1-3분)' : length === 'medium' ? '중간 길이 대본 (3-5분)' : '긴 대본 (5-10분)'}
**등장인물 수:** ${characterCount}명`;

    console.log('🔍 어린이 연극 RAG 기반 참고 청크 검색 중...');
    const childrenRagCriteria = {
      genre: '어린이 연극',
      ageGroup: 'children',
      gender: 'random',
      characterCount: parseInt(characterCount),
      mood: theme
    };
    
    const enhancedPrompt = await enhancePromptWithRAG(prompt, childrenRagCriteria);

    console.log('🚀 어린이 연극 대본 생성 중 (GPT-4o 모델 사용)');
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: "당신은 어린이 연극 전문 작가입니다. 교육적이고 재미있는 어린이용 연극 대본을 한국어로 작성하세요."
      },
      {
        role: "user",
        content: enhancedPrompt
      }
    ], {
      model: MODEL_FINAL,
      temperature: TEMPERATURE_FINAL,
      max_completion_tokens: MAX_COMPLETION_TOKENS
    });

    const generatedScript = completion.choices[0].message.content;
    console.log('✅ 어린이 연극 대본 생성 완료');

    // 제목 추출
    const title = extractTitleFromScript(generatedScript);

    // 스크립트 저장
    const savedScript = await saveChildrenScript(req.user.id, generatedScript, {
      title: title,
      theme: theme,
      characterCount: parseInt(characterCount) || 1,
      length: length
    });

    // 사용량 확정 (성공 시)
    await commitUsage(req.user.id, usageInfo.month);
    console.log(`✅ 어린이 연극 대본 저장 완료 - ID: ${savedScript.id}`);

    res.status(200).json({
      success: true,
      script: {
        id: savedScript.id,
        title: title,
        content: generatedScript,
        characterCount: parseInt(characterCount),
        genre: `어린이 연극 - ${theme}`,
        length: length,
        gender: 'random',
        age: 'children',
        template: 'children',
        theme: theme,
        createdAt: new Date().toISOString()
      },
      metadata: {
        characterCount,
        genre: `어린이 연극 - ${theme}`,
        gender: 'random',
        age: 'children',
        length: length,
        template: 'children',
        theme: theme,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 어린이 연극 대본 생성 오류 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.type,
      status: error.status
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