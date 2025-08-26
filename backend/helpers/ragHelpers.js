// RAG (Retrieval-Augmented Generation) Helper Functions
// 스크립트 청크를 활용한 대본 생성 지원

const { supabaseAdmin } = require('../config/supabase');

/**
 * 요청된 조건에 맞는 참고 청크들을 검색하여 반환
 * @param {Object} criteria - 검색 조건
 * @param {string} criteria.genre - 장르
 * @param {string} criteria.mood - 분위기
 * @param {string} criteria.ageGroup - 연령대
 * @param {string} criteria.gender - 성별
 * @param {number} limit - 반환할 청크 개수
 * @returns {Array} 관련 청크들
 */
async function getRelevantChunks(criteria, limit = 3) {
  try {
    console.log('🔍 RAG 청크 검색 시작:', criteria);
    
    let query = supabaseAdmin
      .from('script_chunks')
      .select('*');
    
    // 장르 필터링
    if (criteria.genre) {
      const genreMap = {
        '로맨스': ['로맨스', '로맨스 코미디', '멜로'],
        '비극': ['비극', '드라마', '슬픔'],
        '코미디': ['코미디', '로맨스 코미디', '유머'],
        '스릴러': ['스릴러', '서스펜스', '긴장'],
        '액션': ['액션', '격투', '추격'],
        '공포': ['공포', '호러', '무서움'],
        '판타지': ['판타지', '마법', '환상'],
        'SF': ['SF', '미래', '과학'],
        '시대극': ['사극', '시대극', '역사']
      };
      
      const searchGenres = genreMap[criteria.genre] || [criteria.genre];
      query = query.or(
        searchGenres.map(g => `genre.ilike.%${g}%`).join(',')
      );
    }
    
    // 연령대 필터링
    if (criteria.ageGroup) {
      const ageMap = {
        'teens': ['청소년', '10대', '고등학생'],
        '20s': ['20대', '대학생', '청년'],
        '30s-40s': ['30대', '40대', '중년'],
        '50s': ['50대', '장년'],
        '70s+': ['70대', '노년', '할머니', '할아버지']
      };
      
      const searchAges = ageMap[criteria.ageGroup] || [criteria.ageGroup];
      query = query.or(
        searchAges.map(a => `age_group.ilike.%${a}%`).join(',')
      );
    }
    
    // 성별 필터링
    if (criteria.gender && criteria.gender !== 'random') {
      const genderMap = {
        'male': ['남성', '남자'],
        'female': ['여성', '여자']
      };
      
      const searchGenders = genderMap[criteria.gender] || [criteria.gender];
      query = query.or(
        searchGenders.map(g => `gender.ilike.%${g}%`).join(',')
      );
    }
    
    // 결과 제한 및 정렬
    query = query
      .order('created_at', { ascending: false })
      .limit(limit);
    
    const { data: chunks, error } = await query;
    
    if (error) {
      console.error('❌ 청크 검색 오류:', error);
      return [];
    }
    
    console.log(`✅ ${chunks?.length || 0}개의 관련 청크 발견`);
    return chunks || [];
    
  } catch (error) {
    console.error('❌ RAG 청크 검색 중 오류:', error);
    return [];
  }
}

/**
 * 청크들을 분석하여 참고 패턴 추출
 * @param {Array} chunks - 검색된 청크들
 * @returns {Object} 추출된 패턴들
 */
function extractReferencePatterns(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      stylePatterns: [],
      emotionPatterns: [],
      dialoguePatterns: [],
      structurePatterns: []
    };
  }
  
  console.log('📊 참고 패턴 추출 중...');
  
  // 스타일 패턴 추출
  const stylePatterns = chunks.flatMap(chunk => chunk.style_tags || [])
    .filter((tag, index, arr) => arr.indexOf(tag) === index); // 중복 제거
  
  // 감정 곡선 패턴 추출
  const emotionPatterns = chunks.map(chunk => chunk.emotion_curve)
    .filter(curve => curve)
    .filter((curve, index, arr) => arr.indexOf(curve) === index);
  
  // 대사 스타일 분석
  const dialoguePatterns = chunks.map(chunk => {
    const content = chunk.content || '';
    const scriptMatch = content.match(/\[Script\]([\s\S]*?)(?=\[|$)/);
    if (scriptMatch) {
      return {
        tone: chunk.tone,
        pacing: chunk.pacing,
        lineCount: chunk.line_count,
        sample: scriptMatch[1].trim().split('\n')[0] // 첫 번째 대사만
      };
    }
    return null;
  }).filter(p => p);
  
  // 구조 패턴
  const structurePatterns = chunks.map(chunk => ({
    purpose: chunk.scene_purpose,
    conflictLevel: chunk.conflict_level,
    actionType: chunk.action_type,
    mood: chunk.mood
  }));
  
  console.log('✅ 패턴 추출 완료:', {
    styles: stylePatterns.length,
    emotions: emotionPatterns.length,
    dialogues: dialoguePatterns.length,
    structures: structurePatterns.length
  });
  
  return {
    stylePatterns,
    emotionPatterns,
    dialoguePatterns,
    structurePatterns
  };
}

/**
 * RAG 참고 정보를 프롬프트에 통합
 * @param {Array} chunks - 검색된 청크들
 * @param {Object} patterns - 추출된 패턴들
 * @returns {string} RAG 참고 섹션
 */
function buildRAGReference(chunks, patterns) {
  if (!chunks || chunks.length === 0) {
    return '';
  }
  
  console.log('📝 RAG 참고 정보 구성 중...');
  
  let ragSection = '\n\n**📚 [참고 청크] - 기존 작품 패턴 분석**\n';
  ragSection += '[참고 청크]들은 기존 작품들을 2차 저작물로 요약/패턴화한 데이터입니다.\n';
  ragSection += '이 청크들의 스타일, 톤, 캐릭터 묘사를 참고하여 새로운 대본을 작성하세요.\n';
  ragSection += '단, 원문을 그대로 쓰지 말고 **참고 패턴만 활용해 완전히 새로운 대본**을 만드세요.\n';
  ragSection += '대본은 반드시 한국어로 출력하고, 배우들이 연습할 수 있도록 현실적인 말투와 무대 지시문을 포함해야 합니다.\n\n';
  
  // 참고 청크 예시들
  chunks.forEach((chunk, index) => {
    ragSection += `**참고 청크 ${index + 1}:**\n`;
    ragSection += `- 장르/톤: ${chunk.genre} / ${chunk.tone}\n`;
    ragSection += `- 감정 변화: ${chunk.emotion_curve}\n`;
    ragSection += `- 캐릭터: ${chunk.characters?.join(', ') || '정보 없음'}\n`;
    ragSection += `- 장면 목적: ${chunk.scene_purpose}\n`;
    
    // 대사 샘플 추출
    const content = chunk.content || '';
    const scriptMatch = content.match(/\[Script\]([\s\S]*?)(?=\[|$)/);
    if (scriptMatch) {
      const sampleLines = scriptMatch[1].trim().split('\n').slice(0, 2); // 처음 2줄만
      ragSection += `- 대사 스타일 참고:\n`;
      sampleLines.forEach(line => {
        if (line.trim()) {
          ragSection += `  ${line.trim()}\n`;
        }
      });
    }
    ragSection += '\n';
  });
  
  // 추출된 패턴 요약
  if (patterns.stylePatterns.length > 0) {
    ragSection += `**스타일 패턴 참고:** ${patterns.stylePatterns.join(', ')}\n`;
  }
  
  if (patterns.emotionPatterns.length > 0) {
    ragSection += `**감정 변화 패턴:** ${patterns.emotionPatterns.join(' / ')}\n`;
  }
  
  ragSection += '\n**❗ 중요:** 위 참고 자료는 스타일과 패턴 이해용입니다. 원문을 복사하지 말고, 패턴을 참고하여 완전히 새로운 대본을 창작하세요.\n\n';
  
  console.log('✅ RAG 참고 정보 구성 완료');
  return ragSection;
}

/**
 * RAG 기반 프롬프트 향상
 * @param {string} originalPrompt - 원본 프롬프트
 * @param {Object} criteria - 검색 조건
 * @returns {string} RAG가 적용된 향상된 프롬프트
 */
async function enhancePromptWithRAG(originalPrompt, criteria) {
  try {
    console.log('🚀 RAG 기반 프롬프트 향상 시작');
    
    // 관련 청크 검색
    const relevantChunks = await getRelevantChunks(criteria, 3);
    
    if (relevantChunks.length === 0) {
      console.log('📝 관련 청크 없음 - 기본 프롬프트 사용');
      return originalPrompt;
    }
    
    // 패턴 추출
    const patterns = extractReferencePatterns(relevantChunks);
    
    // RAG 참고 정보 구성
    const ragReference = buildRAGReference(relevantChunks, patterns);
    
    // 프롬프트에 RAG 정보 통합
    const enhancedPrompt = originalPrompt + ragReference;
    
    console.log('✅ RAG 프롬프트 향상 완료');
    return enhancedPrompt;
    
  } catch (error) {
    console.error('❌ RAG 프롬프트 향상 중 오류:', error);
    return originalPrompt; // 실패 시 원본 프롬프트 반환
  }
}

module.exports = {
  getRelevantChunks,
  extractReferencePatterns,
  buildRAGReference,
  enhancePromptWithRAG
};