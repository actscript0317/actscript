const { MODEL_FINAL, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../config/ai');
const { callOpenAIWithRetry } = require('./aiHelpers');
const { extractTitleFromScript, saveScript } = require('./scriptHelpers');
const { enhancePromptWithRAG } = require('./ragHelpers');
const { commitUsage } = require('./usage');

/**
 * 어린이 연극 템플릿 전용 대본 생성
 */
async function generateChildrenTheaterScript(openai, userId, requestData, usageInfo) {
  try {
    const { characterCount, length, characters, template, theme, themePrompt } = requestData;

    console.log(`🎭 어린이 연극 "${theme}" 테마 대본 생성 시작`);
    
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
- 어린이가 따라 할 수 있는 적절한 언어 사용`;

    console.log('🔍 어린이 연극 RAG 기반 참고 청크 검색 중...');
    const childrenRagCriteria = {
      genre: '어린이 연극',
      ageGroup: 'children',
      gender: 'random',
      characterCount: parseInt(characterCount),
      mood: theme // 테마를 mood로 사용
    };
    
    const enhancedChildrenPrompt = await enhancePromptWithRAG(prompt, childrenRagCriteria);

    console.log('🎭 어린이 연극 대본 생성 중 (GPT-4o 모델 사용)');
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "user",
        content: enhancedChildrenPrompt
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

    // 스크립트 저장 (어린이 연극 전용)
    console.log('💾 Supabase에 어린이 연극 대본 저장 시작');
    const savedScript = await saveScript(userId, generatedScript, {
      title: title,
      genre: `어린이 연극 - ${theme}`,
      characterCount: parseInt(characterCount) || 1,
      length: length,
      gender: 'random',
      age: 'children',
      isCustom: false,
      template: 'children',
      theme: theme
    });

    // 사용량 확정 (성공 시)
    await commitUsage(userId, usageInfo.month);
    console.log(`✅ 어린이 연극 대본 저장 완료 - ID: ${savedScript.id}`);

    return {
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
    };
  } catch (error) {
    console.error('❌ 어린이 연극 대본 생성 오류:', error);
    throw error; // 상위 레벨에서 에러 핸들링하도록 전파
  }
}

module.exports = {
  generateChildrenTheaterScript
};
