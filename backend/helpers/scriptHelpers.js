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

// 스크립트 저장 공통 함수
async function saveScript(userId, scriptContent, metadata = {}) {
  const extractedTitle = extractTitleFromScript(scriptContent);
  const title = metadata.title || extractedTitle || '제목 없음';
  
  const scriptData = {
    user_id: userId,
    title,
    content: scriptContent,
    genre: metadata.genre,
    character_count: metadata.characterCount,
    script_length: metadata.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_custom: metadata.isCustom || false,
    prompt: metadata.prompt || null
  };

  const saveResult = await safeQuery(async () => {
    return await supabaseAdmin.from('scripts').insert([scriptData]).select().single();
  }, 'Supabase 스크립트 저장');

  if (!saveResult.success) {
    console.error('❌ 스크립트 저장 실패:', saveResult.error);
    throw new Error('스크립트 저장에 실패했습니다.');
  }

  return saveResult.data;
}

module.exports = {
  extractTitleFromScript,
  saveScript
};