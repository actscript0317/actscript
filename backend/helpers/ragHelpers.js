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

    // 필터링 결과가 없으면 스타일 유사성 기반 선택 (폴백)
    if (filteredChunks.length === 0 && allChunks && allChunks.length > 0) {
      console.log('🔄 필터링된 청크가 없어서 스타일 유사성 기반 선택');
      filteredChunks = selectSimilarStyleChunks(allChunks, criteria);
    } else if (filteredChunks.length > 0) {
      // 필터링된 청크 중에서도 스타일 유사성 기준으로 정렬
      filteredChunks = selectSimilarStyleChunks(filteredChunks, criteria);
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

  // 대사 톤/스타일 심화 분석 (새 스키마: text 칼럼 활용)
  const dialogueStylePatterns = chunks.map(chunk => {
    const text = chunk.text || '';
    if (text.trim()) {
      // 기본 문장 분석
      const sentences = text.split(/[.!?]/).filter(s => s.trim());
      const words = text.split(/\s+/).filter(w => w.trim());

      // 대사 톤 분석
      const toneAnalysis = {
        // 문체 특성
        formalityLevel: analyzeFormalityLevel(text),
        speechPattern: analyzeSpeechPattern(text),
        emotionalTone: analyzeEmotionalTone(text),

        // 구조적 특성
        averageWordsPerSentence: Math.round(words.length / sentences.length) || 0,
        sentenceVariety: analyzeSentenceVariety(sentences),

        // 언어적 특성
        vocabularyStyle: analyzeVocabularyStyle(text),
        rhetoricalDevices: analyzeRhetoricalDevices(text),

        // 대화 특성
        conversationStyle: analyzeConversationStyle(text),
        characterVoice: analyzeCharacterVoice(text, chunk.age, chunk.gender)
      };

      return {
        genre: chunk.genre,
        age: chunk.age,
        gender: chunk.gender,
        numCharacters: chunk.num_characters,
        fullText: text,
        toneAnalysis: toneAnalysis,
        styleFingerprint: generateStyleFingerprint(toneAnalysis)
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
    dialogueStyle: dialogueStylePatterns.length,
    scene: scenePatterns.length,
    demographic: demographicPatterns.length
  });

  return {
    emotionalPatterns,
    dialogueStylePatterns,
    scenePatterns,
    demographicPatterns
  };
}

// === 대사 스타일 분석 헬퍼 함수들 ===

/**
 * 격식도/정중함 수준 분석
 */
function analyzeFormalityLevel(text) {
  const formalMarkers = ['습니다', '하세요', '합시다', '하십시오', '되십시다'];
  const informalMarkers = ['해', '야', '지', '어', '가'];
  const veryInformalMarkers = ['ㅋㅋ', '헐', '와', '엄청', '진짜'];

  const formalCount = formalMarkers.reduce((count, marker) =>
    count + (text.split(marker).length - 1), 0);
  const informalCount = informalMarkers.reduce((count, marker) =>
    count + (text.split(marker).length - 1), 0);
  const veryInformalCount = veryInformalMarkers.reduce((count, marker) =>
    count + (text.split(marker).length - 1), 0);

  if (formalCount > informalCount + veryInformalCount) return '정중한';
  if (veryInformalCount > 0) return '친근한';
  if (informalCount > formalCount) return '편안한';
  return '중립적';
}

/**
 * 말하기 패턴 분석
 */
function analyzeSpeechPattern(text) {
  const patterns = [];

  // 반복 패턴
  if (text.includes('...') || text.includes('··')) patterns.push('망설임');
  if ((text.match(/[!]/g) || []).length > 2) patterns.push('열정적');
  if ((text.match(/[?]/g) || []).length > 1) patterns.push('의문형');
  if (text.includes('아니') || text.includes('그런데')) patterns.push('대화적');
  if (text.includes('음') || text.includes('어') || text.includes('그')) patterns.push('자연스러운');

  return patterns.length > 0 ? patterns.join(', ') : '단조로운';
}

/**
 * 감정 톤 분석
 */
function analyzeEmotionalTone(text) {
  const emotionMarkers = {
    '기쁨': ['좋아', '행복', '기뻐', '웃', '하하', 'ㅎㅎ'],
    '슬픔': ['슬프', '아쉽', '안타깝', '눈물', '울', '흑흑'],
    '분노': ['화나', '짜증', '분하', '억울', '뭐야', '그만'],
    '놀람': ['깜짝', '어머', '세상에', '헐', '와', '대박'],
    '걱정': ['걱정', '불안', '두렵', '무서', '조심', '혹시'],
    '사랑': ['사랑', '좋아해', '예뻐', '멋져', '소중', '감사']
  };

  for (const [emotion, markers] of Object.entries(emotionMarkers)) {
    if (markers.some(marker => text.includes(marker))) {
      return emotion;
    }
  }
  return '중성적';
}

/**
 * 문장 다양성 분석
 */
function analyzeSentenceVariety(sentences) {
  if (sentences.length <= 1) return '단순';

  const lengths = sentences.map(s => s.trim().length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

  if (variance > 100) return '다양함';
  if (variance > 50) return '보통';
  return '균등함';
}

/**
 * 어휘 스타일 분석
 */
function analyzeVocabularyStyle(text) {
  const styles = [];

  // 한자어 vs 순우리말
  const difficultWords = ['상황', '문제', '해결', '관계', '결과', '과정'];
  const simpleWords = ['일', '때문', '같이', '이제', '그냥', '진짜'];

  const difficultCount = difficultWords.reduce((count, word) =>
    count + (text.split(word).length - 1), 0);
  const simpleCount = simpleWords.reduce((count, word) =>
    count + (text.split(word).length - 1), 0);

  if (difficultCount > simpleCount) styles.push('격식적');
  else if (simpleCount > difficultCount) styles.push('일상적');

  // 특수 표현
  if (text.includes('그런') || text.includes('이런')) styles.push('설명적');
  if (text.includes('뭔가') || text.includes('좀')) styles.push('모호한');

  return styles.length > 0 ? styles.join(', ') : '평범한';
}

/**
 * 수사법 분석
 */
function analyzeRhetoricalDevices(text) {
  const devices = [];

  if ((text.match(/[?]/g) || []).length > 0) devices.push('의문법');
  if ((text.match(/[!]/g) || []).length > 0) devices.push('감탄법');
  if (text.includes('마치') || text.includes('같은')) devices.push('비유법');
  if (text.includes('정말') || text.includes('너무')) devices.push('강조법');

  return devices.length > 0 ? devices.join(', ') : '평서법';
}

/**
 * 대화 스타일 분석
 */
function analyzeConversationStyle(text) {
  if (text.includes('그래?') || text.includes('정말?')) return '반응형';
  if (text.includes('하지만') || text.includes('그런데')) return '논리적';
  if (text.includes('음') || text.includes('어')) return '사색적';
  if ((text.match(/[!]/g) || []).length > 2) return '적극적';
  return '차분한';
}

/**
 * 캐릭터 목소리 분석 (나이/성별 고려)
 */
function analyzeCharacterVoice(text, age, gender) {
  const ageGroup = typeof age === 'string' ? age : `${age}대`;

  // 연령대별 특성
  const ageCharacteristics = {
    '10대': text.includes('완전') || text.includes('대박') ? '10대다운' : '성숙한',
    '20대': text.includes('진짜') || text.includes('그냥') ? '20대다운' : '어른스러운',
    '30대': text.includes('아이고') || text.includes('그러게') ? '30대다운' : '젊은',
    '40대': text.includes('자네') || text.includes('허허') ? '40대다운' : '젊은',
    '50대': text.includes('그래') || text.includes('아이고') ? '50대다운' : '젊은'
  };

  // 성별 특성
  const genderStyle = gender === '여자' ?
    (text.includes('아') || text.includes('어머') ? '여성스러운' : '중성적') :
    (text.includes('야') || text.includes('어') ? '남성스러운' : '중성적');

  return `${ageCharacteristics[ageGroup] || '일반적'}, ${genderStyle}`;
}

/**
 * 스타일 지문 생성 (유사한 스타일끼리 그룹핑하기 위함)
 */
function generateStyleFingerprint(toneAnalysis) {
  return `${toneAnalysis.formalityLevel}_${toneAnalysis.emotionalTone}_${toneAnalysis.conversationStyle}`;
}

/**
 * 요청 조건과 유사한 스타일의 청크들을 우선 선택
 * @param {Array} chunks - 선택할 청크들
 * @param {Object} criteria - 요청 조건
 * @returns {Array} 스타일 유사성 순으로 정렬된 청크들
 */
function selectSimilarStyleChunks(chunks, criteria) {
  if (!chunks || chunks.length === 0) return [];

  console.log('🎯 스타일 유사성 기반 청크 선택 중...');

  // 각 청크의 대사 스타일 분석 및 점수 계산
  const scoredChunks = chunks.map(chunk => {
    const text = chunk.text || '';
    if (!text.trim()) return { chunk, score: 0 };

    // 간단한 스타일 분석
    const styleScore = calculateStyleSimilarity(text, chunk, criteria);

    return { chunk, score: styleScore };
  });

  // 점수 순으로 정렬 (높은 점수부터)
  const sortedChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .map(item => item.chunk);

  console.log('📊 스타일 유사성 점수 계산 완료');
  return sortedChunks;
}

/**
 * 스타일 유사성 점수 계산
 * @param {string} text - 대사 텍스트
 * @param {Object} chunk - 청크 정보
 * @param {Object} criteria - 요청 조건
 * @returns {number} 유사성 점수 (0-100)
 */
function calculateStyleSimilarity(text, chunk, criteria) {
  let score = 0;

  // 기본 매칭 점수
  if (chunk.genre === criteria.genre) score += 30;
  if (chunk.age === criteria.age || String(chunk.age).includes(String(criteria.age))) score += 20;
  if (chunk.gender === criteria.gender) score += 15;

  // 대사 복잡도 유사성 (요청된 캐릭터 수에 따른)
  const sentences = text.split(/[.!?]/).filter(s => s.trim());
  const avgWordsPerSentence = text.split(/\s+/).length / sentences.length;

  if (criteria.characterCount) {
    // 등장인물이 많을수록 복잡한 대사를 선호
    if (criteria.characterCount >= 3 && avgWordsPerSentence > 6) score += 15;
    else if (criteria.characterCount <= 2 && avgWordsPerSentence <= 6) score += 15;
  }

  // 감정적 강도 유사성
  const emotionalMarkers = (text.match(/[!?]/g) || []).length;
  if (emotionalMarkers > 2) score += 10; // 감정이 풍부한 대사 선호

  // 대화적 특성 (연기용 대본에 적합한지)
  if (text.includes('..') || text.includes('음') || text.includes('어')) {
    score += 5; // 자연스러운 대화체
  }

  // 적절한 길이의 대사인지 (너무 짧거나 길지 않은)
  if (text.length >= 50 && text.length <= 200) score += 10;

  return Math.min(score, 100); // 최대 100점으로 제한
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

  console.log('📝 RAG 참고 정보 구성 중 (대사 스타일 중심)...');

  // 대사 스타일 패턴 분석
  const stylePatterns = extractReferencePatterns(chunks);

  let ragSection = '\n\n**📚 [참고 대본] 이 스타일대로 대본을 작성하세요**\n\n';

  // 청크에서 직접 대본 추출
  chunks.forEach((chunk, index) => {
    ragSection += `**참고 대본 ${index + 1}** (${chunk.genre} | ${chunk.age} ${chunk.gender}):\n`;
    ragSection += `"${chunk.text}"\n\n`;
  });

  ragSection += '**💡 작성 방법:**\n';
  ragSection += '위 대본들과 **똑같은 스타일과 말투**로 새로운 대본을 작성하세요.\n';
  ragSection += '내용만 다르게 하고, 말하는 방식은 위와 비슷하게 해주세요.\n';
  ragSection += '**사건/계기 (Scene Trigger)**  \n';
  ragSection += '주인공이 독백을 하게 되는 구체적 상황을 반드시 포함하세요. \n';
  ragSection += '예: 연락이 오지 않음, 약속 파기, 부모와 갈등, 물건 분실 등.\n'; 

  ragSection +='2. **감정 흐름 구조 (Emotion Flow)**  \n';
  ragSection += '도입: 사건 제시 + 감정 시작 (서운함, 분노, 혼란 등)  \n';
  ragSection += '전개/갈등: 감정이 점차 고조되고 반복적으로 강조됨  \n';
  ragSection += '결론/엔딩: 감정이 정리되며 결심 또는 고백으로 끝남  \n';

  ragSection +='3. **감정맥락 (Emotional Context)**  \n';
  ragSection += '단순히 “좋아해/싫어”가 아니라, **왜** 이런 감정이 생겼는지 구체적으로 묘사하세요.  \n';
  ragSection += '(예: 무심한 척했는데 오히려 더 다쳤다, 기다리다 상처받았다 등)  \n';

  ragSection +='4. **반복/라임 멘트 (Repetition / Rhyme)**  \n';
  ragSection += '- 대사의 한 부분은 감정을 강조하기 위해 비슷한 말을 반복하거나 변주하세요.  \n';
  ragSection += '(예: “나만 바보 같았잖아. 나만 멍청하게 서 있었잖아.”)  \n';

  ragSection +='5. **엔딩멘트 (Ending Line)**  \n';
  ragSection +='- 마지막은 담백하지만 여운이 남는 한두 줄로 마무리하세요.  \n';
  ragSection += '- (예: “나, 너 좋아해. 나는 네가 오기만 하면 돼.”)\n\n';

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