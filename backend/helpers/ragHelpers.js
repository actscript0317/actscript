// RAG (Retrieval-Augmented Generation) Helper Functions
// 스크립트 청크를 활용한 대본 생성 지원

const { supabaseAdmin } = require('../config/supabase');

/**
 * 요청된 조건에 맞는 참고 청크들을 검색하여 반환 (새로운 스키마 대응)
 * @param {Object} criteria - 검색 조건
 * @param {string} criteria.genre - 장르
 * @param {string} criteria.ageGroup - 연령대
 * @param {string} criteria.gender - 성별
 * @param {number} criteria.characterCount - 등장인물 수
 * @param {number} limit - 반환할 청크 개수
 * @returns {Array} 관련 청크들
 */
async function getRelevantChunks(criteria, limit = 3) {
  try {
    console.log('🔍 RAG 청크 검색 시작 (새 스키마):', JSON.stringify(criteria, null, 2));

    let query = supabaseAdmin
      .from('script_chunks')
      .select('*');

    // 모든 청크 조회 후 JavaScript 필터링
    console.log('📊 모든 청크 조회 후 JavaScript 필터링 적용');

    if (criteria.characterCount) {
      console.log(`👥 요청된 인물 수: ${criteria.characterCount}명`);
    }

    // 생성 순서대로 조회 (id 기준)
    const { data: allChunks, error } = await query.order('id', { ascending: false });

    if (error) {
      console.error('❌ 청크 검색 오류:', error);
      return [];
    }

    console.log(`📋 총 ${allChunks?.length || 0}개 청크 조회됨, 필터링 시작...`);

    // JavaScript로 필터링 수행
    let filteredChunks = allChunks || [];

    // 장르 필터링
    if (criteria.genre) {
      const genreMap = {
        '로맨스': ['로맨스', '로맨스 코미디', '멜로'],
        '비극': ['비극', '드라마', '슬픔'],
        '코미디': ['코미디', '로맨스 코미디', '유머'],
        '드라마': ['드라마', '감동', '현실'],
        '스릴러': ['스릴러', '서스펜스', '긴장'],
        '액션': ['액션', '격투', '추격'],
        '공포': ['공포', '호러', '무서움'],
        '판타지': ['판타지', '마법', '환상'],
        'SF': ['SF', '미래', '과학'],
        '시대극': ['사극', '시대극', '역사']
      };

      const searchGenres = genreMap[criteria.genre] || [criteria.genre];
      filteredChunks = filteredChunks.filter(chunk => {
        const genre = chunk.genre || '';
        return searchGenres.some(g => genre.toLowerCase().includes(g.toLowerCase()));
      });
      console.log(`🎭 장르 필터링 후: ${filteredChunks.length}개 (조건: ${searchGenres.join(', ')})`);
    }

    // 연령대 필터링 (새 스키마: age 칼럼 사용)
    if (criteria.ageGroup) {
      const ageMap = {
        'children': ['어린이', '5~9세', '유아'],
        'kids': ['초등학생', '10~12세', '아동'],
        'teens': ['10대', '청소년', '고등학생', '학생'],
        '20s': ['20대', '청년', '대학생', '젊은'],
        '30s-40s': ['30대', '40대', '중년', '성인'],
        '50s': ['50대', '장년'],
        '70s+': ['70대', '노년', '할머니', '할아버지', '고령'],
        'random': [] // 랜덤인 경우 필터링하지 않음
      };

      const searchAges = ageMap[criteria.ageGroup] || [criteria.ageGroup];
      if (searchAges.length > 0) {
        filteredChunks = filteredChunks.filter(chunk => {
          const age = (chunk.age || '').toLowerCase();
          return searchAges.some(a =>
            age.includes(a.toLowerCase()) ||
            a.toLowerCase().includes(age)
          );
        });
        console.log(`👶 연령대 필터링 후: ${filteredChunks.length}개 (조건: ${searchAges.join(', ')})`);
      }
    }

    // 성별 필터링
    if (criteria.gender && criteria.gender !== 'random') {
      filteredChunks = filteredChunks.filter(chunk => {
        const gender = (chunk.gender || '').toLowerCase();

        // "혼합"이나 비어있는 경우는 모든 성별 요청에 매칭
        if (gender === '혼합' || gender === '' || gender === 'mixed') {
          return true;
        }

        // 구체적 성별 매칭
        if (criteria.gender === 'male') {
          return gender.includes('남') || gender.includes('male');
        } else if (criteria.gender === 'female') {
          return gender.includes('여') || gender.includes('female');
        }

        return false;
      });
      console.log(`👫 성별 필터링 후: ${filteredChunks.length}개 (조건: ${criteria.gender})`);
    }

    // 등장인물 수 필터링 (새 스키마: num_characters 칼럼 사용)
    if (criteria.characterCount && typeof criteria.characterCount === 'number') {
      filteredChunks = filteredChunks.filter(chunk => {
        const numChars = chunk.num_characters;
        // 정확히 일치하거나 ±1 범위 허용
        return numChars === criteria.characterCount ||
               Math.abs(numChars - criteria.characterCount) <= 1;
      });
      console.log(`👥 등장인물 수 필터링 후: ${filteredChunks.length}개 (조건: ${criteria.characterCount}명)`);
    }

    // 필터링 결과가 없으면 전체 청크에서 랜덤 선택 (폴백)
    if (filteredChunks.length === 0 && allChunks && allChunks.length > 0) {
      console.log('🔄 필터링된 청크가 없어서 전체 청크에서 랜덤 선택');
      filteredChunks = allChunks;
    }

    // 결과 제한
    const chunks = filteredChunks.slice(0, limit);

    console.log(`✅ ${chunks?.length || 0}개의 관련 청크 발견`);
    if (chunks && chunks.length > 0) {
      console.log('📋 발견된 청크 정보:');
      chunks.forEach((chunk, index) => {
        console.log(`  ${index + 1}. ${chunk.genre} - ${chunk.age} (${chunk.num_characters}명, ${chunk.gender})`);
      });
    } else {
      console.log('⚠️ 검색 조건에 맞는 청크를 찾지 못했습니다:', criteria);
    }
    return chunks || [];

  } catch (error) {
    console.error('❌ RAG 청크 검색 중 오류:', error);
    return [];
  }
}

/**
 * 청크들을 분석하여 참고 패턴 추출 (새로운 스키마 대응)
 * @param {Array} chunks - 검색된 청크들
 * @returns {Object} 추출된 패턴들
 */
function extractReferencePatterns(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      emotionalPatterns: [],
      dialoguePatterns: [],
      scenePatterns: [],
      demographicPatterns: []
    };
  }

  console.log('📊 참고 패턴 추출 중 (새 스키마)...');

  // 감정적 맥락 패턴 추출 (새 스키마: emotional_context 활용)
  const emotionalPatterns = chunks.map(chunk => chunk.emotional_context)
    .filter(context => context)
    .filter((context, index, arr) => arr.indexOf(context) === index); // 중복 제거

  // 대사 스타일 분석 (새 스키마: text 칼럼 활용)
  const dialoguePatterns = chunks.map(chunk => {
    const text = chunk.text || '';
    if (text.trim()) {
      const sentences = text.split(/[.!?]/).filter(s => s.trim());
      const totalSentences = sentences.length;

      // 대사의 구조 분석
      const textAnalysis = {
        length: text.length,
        sentenceCount: totalSentences,
        hasQuestion: text.includes('?'),
        hasExclamation: text.includes('!'),
        emotionalIntensity: (text.match(/[!?]/g) || []).length,
        firstSentence: sentences[0]?.trim() || '',
        lastSentence: sentences[sentences.length - 1]?.trim() || ''
      };

      return {
        genre: chunk.genre,
        age: chunk.age,
        gender: chunk.gender,
        numCharacters: chunk.num_characters,
        emotionalContext: chunk.emotional_context,
        textAnalysis: textAnalysis
      };
    }
    return null;
  }).filter(p => p);

  // 장면 패턴 (새 스키마: scene_content 활용)
  const scenePatterns = chunks.map(chunk => ({
    sceneContent: chunk.scene_content,
    genre: chunk.genre,
    emotionalContext: chunk.emotional_context,
    sceneIndex: chunk.scene_index,
    chunkIndex: chunk.chunk_index
  }));

  // 인구통계학적 패턴
  const demographicPatterns = chunks.map(chunk => ({
    age: chunk.age,
    gender: chunk.gender,
    numCharacters: chunk.num_characters,
    genre: chunk.genre
  }));

  console.log('✅ 패턴 추출 완료 (새 스키마):', {
    emotional: emotionalPatterns.length,
    dialogue: dialoguePatterns.length,
    scene: scenePatterns.length,
    demographic: demographicPatterns.length
  });

  return {
    emotionalPatterns,
    dialoguePatterns,
    scenePatterns,
    demographicPatterns
  };
}

/**
 * RAG 참고 정보를 프롬프트에 통합 (새로운 스키마 대응)
 * @param {Array} chunks - 검색된 청크들
 * @returns {string} RAG 참고 섹션
 */
function buildRAGReference(chunks) {
  if (!chunks || chunks.length === 0) {
    return '';
  }

  console.log('📝 RAG 참고 정보 구성 중 (새 스키마)...');

  let ragSection = '\n\n**📚 [참고 청크] - 기존 대본 패턴 분석**\n';
  ragSection += '[참고 청크]들은 기존 대본들을 분석하여 패턴화한 데이터입니다.\n';
  ragSection += '이 청크들의 **감정 흐름과 대사 스타일만 참고**하여 새로운 대본을 작성하세요.\n';
  ragSection += '단, 원문을 그대로 쓰지 말고 **패턴만 활용해 완전히 새로운 대본**을 만드세요.\n';
  ragSection += '⚠️ **중요**: 참고 청크의 내용을 복사하지 말고, 반드시 요청된 표준 대본 형식을 사용하세요.\n';
  ragSection += '대본은 반드시 한국어로 출력하고, 배우들이 연습할 수 있도록 현실적인 말투와 무대 지시문을 포함해야 합니다.\n\n';

  // 참고 청크 예시들
  chunks.forEach((chunk, index) => {
    ragSection += `**참고 청크 ${index + 1}:**\n`;
    ragSection += `- 장르: ${chunk.genre}\n`;
    ragSection += `- 연령대: ${chunk.age} / 성별: ${chunk.gender}\n`;
    ragSection += `- 등장인물 수: ${chunk.num_characters}명\n`;
    ragSection += `- 감정적 맥락: ${chunk.emotional_context}\n`;
    ragSection += `- 장면 설명: ${chunk.scene_content}\n`;

    // 대사 텍스트 참고 (새 스키마: text 칼럼)
    const text = chunk.text || '';
    if (text.trim()) {
      ragSection += `- 대사 스타일 참고:\n`;

      // 텍스트를 문장 단위로 분리하여 구조 분석
      const sentences = text.split(/[.!?]/).filter(s => s.trim());
      const totalSentences = sentences.length;

      if (totalSentences <= 3) {
        // 짧은 텍스트는 전체 표시
        ragSection += `  "${text.trim()}"\n`;
      } else {
        // 긴 텍스트는 시작과 끝 부분만 표시
        const firstPart = sentences.slice(0, 2).join('. ') + '.';
        const lastPart = sentences.slice(-1)[0] + '.';
        ragSection += `  시작: "${firstPart}"\n`;
        ragSection += `  마무리: "${lastPart}"\n`;
      }

      // 감정 강도 분석
      const emotionalMarkers = (text.match(/[!?]/g) || []).length;
      if (emotionalMarkers > 0) {
        ragSection += `  감정 강도: ${emotionalMarkers > 2 ? '높음' : '보통'} (${emotionalMarkers}개 감정 표현)\n`;
      }
    }
    ragSection += '\n';
  });

  ragSection += '**❗ 중요:** 위 참고 자료는 스타일과 패턴 이해용입니다. 원문을 복사하지 말고, 패턴을 참고하여 완전히 새로운 대본을 창작하세요.\n\n';

  console.log('✅ RAG 참고 정보 구성 완료 (새 스키마)');
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