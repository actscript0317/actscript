const { supabaseAdmin, safeQuery } = require('../config/supabase');

// 스크립트에서 제목 추출하는 함수
const extractTitleFromScript = (scriptContent) => {
  if (!scriptContent) return null;
  
  const lines = scriptContent.split('\n');
  
  // **제목:** 패턴 찾기
  for (let line of lines) {
    const titleMatch = line.match(/\*\*제목:\*\*\s*(.+)/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }
  
  // [제목] 패턴 찾기  
  for (let line of lines) {
    const titleMatch = line.match(/\[(.+)\]/);
    if (titleMatch && line.includes('제목')) {
      return titleMatch[1].trim();
    }
  }
  
  // 첫 번째 줄이 제목일 가능성
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 50 && !firstLine.includes('[') && !firstLine.includes('상황')) {
    return firstLine;
  }
  
  return null;
};

// AI 스크립트 저장 공통 함수
async function saveScript(userId, scriptContent, metadata = {}) {
  const extractedTitle = extractTitleFromScript(scriptContent);
  const title = metadata.title || extractedTitle || '제목 없음';
  
  // ai_scripts 테이블 구조에 맞게 데이터 구성
  const aiScriptData = {
    user_id: userId,
    title: title,
    content: scriptContent,
    character_count: parseInt(metadata.characterCount) || 1,
    situation: '연기 연습용 대본',
    emotions: [metadata.genre || '기타'],
    gender: metadata.gender === 'male' ? '남자' : metadata.gender === 'female' ? '여자' : '전체',
    mood: metadata.genre || '기타',
    duration: metadata.length === 'short' ? '1~3분' : metadata.length === 'medium' ? '3~5분' : '5분 이상',
    age_group: metadata.age === 'teens' ? '10대' : metadata.age === '20s' ? '20대' : metadata.age === '30s-40s' ? '30~40대' : metadata.age === '50s' ? '50대' : '전체',
    purpose: '오디션',
    script_type: metadata.characterCount > 1 ? '대화' : '독백',
    generation_params: {
      originalGenre: metadata.genre,
      originalLength: metadata.length,
      originalAge: metadata.age,
      originalGender: metadata.gender,
      model: "gpt-4o",
      generateTime: new Date(),
      isCustom: metadata.isCustom || false,
      ...(metadata.prompt && { originalCustomPrompt: metadata.prompt })
    },
    is_public: false,
    created_at: new Date().toISOString()
  };

  const saveResult = await safeQuery(async () => {
    return await supabaseAdmin.from('ai_scripts').insert([aiScriptData]).select().single();
  }, 'AI 스크립트 저장');

  if (!saveResult.success) {
    console.error('❌ AI 스크립트 저장 실패:', saveResult.error);
    throw new Error('스크립트 저장에 실패했습니다.');
  }

  return saveResult.data;
}

module.exports = {
  extractTitleFromScript,
  saveScript
};
