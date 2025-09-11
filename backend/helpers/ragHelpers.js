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
 * @param {number} criteria.characterCount - 등장인물 수
 * @param {number} limit - 반환할 청크 개수
 * @returns {Array} 관련 청크들
 */
async function getRelevantChunks(criteria, limit = 3) {
  try {
    console.log('🔍 RAG 청크 검색 시작:', JSON.stringify(criteria, null, 2));
    
    let query = supabaseAdmin
      .from('script_chunks')
      .select('*');
    
    // 일단 필터링 조건 없이 모든 청크를 가져온 다음, 
    // JavaScript에서 필터링하는 방식으로 변경 (더 확실함)
    console.log('📊 필터링 조건 없이 모든 청크 조회 후 JavaScript 필터링 적용');
    
    // 등장인물 수는 현재로서는 직접적인 필터링보다는 로그로만 확인
    // (PostgreSQL 배열 길이 검색이 복잡하므로 향후 개선 예정)
    if (criteria.characterCount) {
      console.log(`👥 요청된 인물 수: ${criteria.characterCount}명`);
    }
    
    // 모든 청크 조회
    const { data: allChunks, error } = await query.order('created_at', { ascending: false });
    
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
    
    // 개선된 연령대 필터링 - 실제 데이터 형태에 맞춰 유연하게 매칭
    if (criteria.ageGroup) {
      const ageMap = {
        'teens': ['10대', '청소년', '고등학생', '학생'],
        '20s': ['20대', '청년', '대학생', '젊은'], 
        '30s-40s': ['30대', '40대', '중년', '성인'], // "성인"은 주로 30-40대를 의미
        '50s': ['50대', '장년', '성인'],
        '70s+': ['70대', '노년', '할머니', '할아버지', '고령']
      };
      
      const searchAges = ageMap[criteria.ageGroup] || [criteria.ageGroup];
      filteredChunks = filteredChunks.filter(chunk => {
        const ageGroup = (chunk.age_group || '').toLowerCase();
        return searchAges.some(a => 
          ageGroup.includes(a.toLowerCase()) || 
          a.toLowerCase().includes(ageGroup)
        );
      });
      console.log(`👶 연령대 필터링 후: ${filteredChunks.length}개 (조건: ${searchAges.join(', ')})`);
    }
    
    // 개선된 성별 필터링 - "혼합" 데이터도 포함하도록 유연하게 매칭
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
        console.log(`  ${index + 1}. ${chunk.genre} - ${chunk.tone} (${chunk.characters?.join(', ') || '캐릭터 정보 없음'})`);
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
  
  // 대사 스타일 분석 (감정 변화와 톤 분석 강화)
  const dialoguePatterns = chunks.map(chunk => {
    const content = chunk.content || '';
    const scriptMatch = content.match(/\[Script\]([\s\S]*?)(?=\[|$)/);
    if (scriptMatch) {
      const allLines = scriptMatch[1].trim().split('\n').filter(line => line.trim());
      const totalLines = allLines.length;
      
      // 대사의 감정 변화 패턴 분석
      const emotionFlow = {
        opening: allLines.slice(0, Math.min(2, totalLines)), // 시작부
        middle: totalLines > 4 ? [allLines[Math.floor(totalLines / 2)]] : [], // 중간부
        ending: totalLines > 2 ? allLines.slice(-2) : [] // 마무리부
      };
      
      return {
        tone: chunk.tone,
        pacing: chunk.pacing,
        lineCount: chunk.line_count,
        emotionCurve: chunk.emotion_curve,
        emotionFlow: emotionFlow,
        dialogueCount: totalLines
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
    ragSection += `- 캐릭터: ${chunk.characters?.join(', ') || '정보 없음'} (${chunk.characters?.length || 0}명)\n`;
    ragSection += `- 장면 목적: ${chunk.scene_purpose}\n`;
    ragSection += `- 관계: ${chunk.relationship_type || '일반'}\n`;
    ragSection += `- 분위기: ${chunk.mood || '일반'}\n`;
    
    // 대사 샘플 추출 (더 많은 대사 포함)
    const content = chunk.content || '';
    const scriptMatch = content.match(/\[Script\]([\s\S]*?)(?=\[|$)/);
    if (scriptMatch) {
      const allLines = scriptMatch[1].trim().split('\n').filter(line => line.trim());
      
      // 감정 변화를 보여줄 수 있는 대사들 선별 (초반, 중반, 후반에서 각각 선택)
      const totalLines = allLines.length;
      const sampleIndices = [];
      
      if (totalLines <= 6) {
        // 짧은 스크립트는 모든 대사 포함
        sampleIndices.push(...Array.from({length: totalLines}, (_, i) => i));
      } else {
        // 긴 스크립트는 초반(0-1), 중반, 후반(마지막-1, 마지막) 대사 선택
        sampleIndices.push(0, 1); // 초반 2줄
        const midIndex = Math.floor(totalLines / 2);
        sampleIndices.push(midIndex); // 중반 1줄
        sampleIndices.push(totalLines - 2, totalLines - 1); // 후반 2줄
      }
      
      const uniqueIndices = [...new Set(sampleIndices)].filter(i => i < totalLines);
      const sampleLines = uniqueIndices.map(i => allLines[i]);
      
      ragSection += `- 대사 스타일 및 감정 흐름 참고:\n`;
      sampleLines.forEach((line, idx) => {
        if (line.trim()) {
          const position = uniqueIndices[idx] === 0 ? '(초반)' : 
                          uniqueIndices[idx] >= totalLines - 2 ? '(후반)' : '(중반)';
          ragSection += `  ${position} ${line.trim()}\n`;
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
  
  // 대사 패턴 상세 분석 추가
  if (patterns.dialoguePatterns.length > 0) {
    ragSection += `\n**대사 작성 참고 패턴:**\n`;
    patterns.dialoguePatterns.forEach((pattern, index) => {
      ragSection += `📝 패턴 ${index + 1}: ${pattern.tone} 톤, ${pattern.emotionCurve || '감정변화 정보 없음'}\n`;
      
      // 감정 흐름별 대사 예시
      if (pattern.emotionFlow) {
        if (pattern.emotionFlow.opening.length > 0) {
          ragSection += `  - 시작부 톤: "${pattern.emotionFlow.opening[0]}"\n`;
        }
        if (pattern.emotionFlow.middle.length > 0) {
          ragSection += `  - 중간부 톤: "${pattern.emotionFlow.middle[0]}"\n`;
        }
        if (pattern.emotionFlow.ending.length > 0) {
          ragSection += `  - 마무리 톤: "${pattern.emotionFlow.ending[pattern.emotionFlow.ending.length - 1]}"\n`;
        }
      }
      ragSection += '\n';
    });
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