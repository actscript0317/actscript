const express = require('express');
const OpenAI = require('openai');
const config = require('../config/env');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');

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

// 사용자 사용량 확인 및 업데이트
const checkAndUpdateUsage = async (userId) => {
  console.log('🔍 사용자 조회 시작:', userId);
  
  // 사용자 정보 조회 (Admin 클라이언트 사용하여 RLS 우회)
  const userResult = await safeQuery(async () => {
    return await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
  }, 'Supabase 사용자 정보 조회');

  if (!userResult.success) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const user = userResult.data;
  const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
  const subscription = user.subscription || { plan: 'free' };

  // 월이 바뀌었으면 사용량 리셋
  const now = new Date();
  const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date();
  
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    usage.currentMonth = 0;
    usage.lastResetDate = now.toISOString();
  }

  // 사용자별 월간 제한 확인 (기본 10회)
  const userLimit = user.usage?.monthly_limit || 10;
  let canGenerate = false;
  let limit = userLimit;

  if (userLimit === 999999) {
    // 무제한 사용자 (관리자가 설정)
    canGenerate = true;
    limit = '무제한';
  } else {
    // 일반 사용자 - 월간 제한 확인
    canGenerate = usage.currentMonth < userLimit;
  }

  if (!canGenerate) {
    const error = new Error('사용량을 초과했습니다.');
    error.statusCode = 429;
    error.details = {
      currentUsage: usage.currentMonth,
      limit: limit,
      planType: subscription.plan,
      nextResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    };
    throw error;
  }

  // 사용량 증가
  usage.currentMonth += 1;
  usage.totalGenerated += 1;

  // 사용량 업데이트 (Admin 클라이언트 사용)
  const updateResult = await safeQuery(async () => {
    return await supabaseAdmin
      .from('users')
      .update({ usage: usage })
      .eq('id', userId);
  }, '사용량 업데이트');
  
  if (!updateResult.success) {
    console.error('❌ 사용량 업데이트 실패:', updateResult.error);
  } else {
    console.log('✅ 사용량 업데이트 완료:', usage);
  }

  return { user, usage };
};

// 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 AI 대본 생성 요청 시작');
    console.log('📝 요청 데이터:', req.body);
    
    // OpenAI API 키 확인
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ OpenAI 클라이언트 초기화 완료');
    
    // 사용량 확인 및 업데이트
    let userInfo;
    try {
      userInfo = await checkAndUpdateUsage(req.user.id);
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

    const { characterCount, genre, length, gender, age } = req.body;

    console.log('📋 받은 대본 생성 옵션:', {
      characterCount,
      genre,
      length,
      gender,
      age
    });

    // 입력값 검증
    if (!characterCount || !genre || !length || !gender || !age) {
      console.error('❌ 필수 필드 누락:', {
        characterCount: !!characterCount,
        genre: !!genre,
        length: !!length,
        gender: !!gender,
        age: !!age
      });
      return res.status(400).json({
        error: '모든 필드를 입력해주세요.',
        required: ['characterCount', 'genre', 'length', 'gender', 'age']
      });
    }

    console.log('📊 사용량 확인 완료:', {
      currentUsage: userInfo.usage.currentMonth,
      plan: userInfo.user.subscription.plan
    });

    // 인물 수에 따른 대본 타입 결정
    let scriptType = '';
    let characterGuide = '';
    
    if (characterCount === '1') {
      scriptType = '독백';
      characterGuide = `
- 반드시 1명의 인물만 등장
- 독백 형식으로 작성 (혼잣말 또는 관객/상대방에게 말하는 형식)
- 다른 인물의 대사는 절대 포함하지 않음
- "인물명: 대사" 형식으로 작성`;
    } else if (characterCount === '2-3') {
      scriptType = '2~3인 대화';
      characterGuide = `
- 정확히 2명 또는 3명의 인물만 등장
- 각 인물이 골고루 대사를 나누어 가짐
- 인물 간의 상호작용과 갈등이 명확해야 함
- 각 인물의 개성이 대사를 통해 드러나야 함`;
    } else if (characterCount === '4+') {
      scriptType = '4인 이상 앙상블';
      characterGuide = `
- 4명 이상의 인물이 등장
- 각 인물이 최소 한 번은 대사를 가져야 함
- 그룹 다이나믹과 개별 캐릭터 특성이 모두 드러나야 함
- 복잡한 상황과 다층적 갈등 구조 포함`;
    }

    // AI 프롬프트 생성
    const prompt = `연기 입시 및 오디션용 고품질 ${scriptType} 대본을 작성해주세요.

**필수 조건:**
- 인물 수: ${characterCount}명 (이 조건을 반드시 준수할 것!)
- 장르: ${genre}
- 길이: ${length}
- 성별: ${gender}
- 연령대: ${age}

**인물 구성 가이드:**${characterGuide}

**대본 구조 요구사항:**
1. **제목:** 감정이나 상황을 압축한 제목
2. **상황 설명:** 언제, 어디서, 왜 일어나는 상황인지 3-4줄로 설명
3. **등장인물:** 각 인물의 이름, 나이, 성격, 현재 상황을 간략히 설명
4. **대본:** 실제 연기용 대사와 지문

**대본 작성 가이드:**
- 감정의 흐름과 변화가 뚜렷해야 함
- 자연스러운 한국어 대화체 사용
- 연기자가 몰입할 수 있는 현실적인 상황
- 지문은 최소화하고 대사를 통해 상황과 감정 전달
- 각 인물의 목적과 갈등이 명확해야 함

**형식:**
제목: [제목]

상황 설명:
[상황 설명]

등장인물:
- [인물명]: [나이, 성격, 상황]

대본:
[인물명]: [대사]
(지문)
[인물명]: [대사]
...

위 형식을 정확히 따라 ${characterCount}명이 등장하는 ${genre} 장르의 ${scriptType} 대본을 작성해주세요.`;

    console.log('🤖 OpenAI API 호출 시작');
    
    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 연기 대본 작성 전문가입니다. 자연스럽고 감정이 풍부한 한국어 연기 대본을 작성해주세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.8,
    });

    const generatedScript = completion.choices[0].message.content;
    console.log('✅ AI 대본 생성 완료');
    console.log('📄 생성된 대본 길이:', generatedScript.length);

    // 제목 추출
    const extractedTitle = extractTitleFromScript(generatedScript);
    const finalTitle = extractedTitle || `${genre} 대본 ${characterCount}인`;

    console.log('📋 추출된 제목:', finalTitle);

    // 감정 키워드 추출 (간단한 키워드 매칭)
    const emotionKeywords = ['기쁨', '슬픔', '분노', '불안', '그리움', '후회', '사랑', '증오', '절망', '희망'];
    const detectedEmotions = emotionKeywords.filter(emotion => 
      generatedScript.includes(emotion) || 
      generatedScript.includes(emotion.substring(0, 2))
    );

    // 기본 감정이 없으면 장르에 따라 추가
    if (detectedEmotions.length === 0) {
      switch(genre) {
        case '로맨스': detectedEmotions.push('사랑'); break;
        case '드라마': detectedEmotions.push('슬픔'); break;
        case '코미디': detectedEmotions.push('기쁨'); break;
        case '스릴러': detectedEmotions.push('불안'); break;
        default: detectedEmotions.push('감정적인');
      }
    }

    // 상황 추출 (첫 번째 상황 설명 부분)
    let situation = '상황 설명';
    const situationMatch = generatedScript.match(/\*\*상황:\*\*\s*(.+?)(?:\n|\*\*)/);
    if (situationMatch) {
      situation = situationMatch[1].trim();
    }

    // AI 스크립트 데이터베이스에 저장
    const aiScriptData = {
      user_id: req.user.id,
      title: finalTitle,
      character_count: parseInt(characterCount),
      situation: situation,
      content: generatedScript,
      emotions: detectedEmotions,
      gender: gender === '상관없음' ? '전체' : gender,
      mood: genre,
      duration: length,
      age_group: age,
      purpose: 'AI 생성',
      script_type: characterCount > 1 ? '대화' : '독백',
      generation_params: JSON.stringify({
        characterCount,
        genre,
        length,
        gender,
        age,
        model: 'gpt-3.5-turbo',
        timestamp: new Date().toISOString()
      }),
      is_public: false
    };

    const saveResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .insert(aiScriptData)
        .select()
        .single();
    }, 'AI 스크립트 저장');

    if (!saveResult.success) {
      console.error('❌ AI 스크립트 저장 실패:', saveResult.error);
      // 저장 실패해도 생성된 스크립트는 반환
    }

    console.log('✅ AI 대본 생성 및 저장 완료');

    res.json({
      success: true,
      message: '대본이 성공적으로 생성되었습니다.',
      script: {
        id: saveResult.success ? saveResult.data.id : null,
        title: finalTitle,
        content: generatedScript,
        characterCount: parseInt(characterCount),
        situation: situation,
        emotions: detectedEmotions,
        genre: genre,
        length: length,
        gender: gender,
        age: age,
        createdAt: new Date().toISOString()
      },
      usage: {
        currentMonth: userInfo.usage.currentMonth,
        totalGenerated: userInfo.usage.totalGenerated,
        plan: userInfo.user.subscription.plan
      }
    });

  } catch (error) {
    console.error('❌ AI 대본 생성 중 오류:', error);
    
    // OpenAI API 오류 처리
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({
        error: 'AI 서비스 사용량을 초과했습니다.',
        message: '잠시 후 다시 시도해주세요.'
      });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'AI 서비스 요청 한도를 초과했습니다.',
        message: '잠시 후 다시 시도해주세요.'
      });
    }

    res.status(500).json({
      error: 'AI 대본 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 사용량 정보 조회 API
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    console.log('📊 사용량 정보 조회 요청:', req.user.id);
    
    // Supabase Admin 클라이언트 확인
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin 클라이언트가 설정되지 않음');
      return res.status(503).json({
        success: false,
        message: 'Supabase Admin 클라이언트가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ Supabase Admin 클라이언트 확인 완료');
    
    // 사용자 정보 조회 (Admin 클라이언트 사용)
    console.log('🔍 사용자 정보 조회 시작...');
    const userResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용량 조회용 사용자 정보');
    
    console.log('📊 사용자 조회 결과:', { success: userResult.success, hasData: !!userResult.data });

    if (!userResult.success) {
      console.error('❌ 사용량 조회 실패:', userResult.error);
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.data;
    const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
    const subscription = user.subscription || { plan: 'test' };

    // 월이 바뀌었으면 사용량 리셋
    const now = new Date();
    const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date();
    
    let resetUsage = { ...usage };
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      resetUsage.currentMonth = 0;
      resetUsage.lastResetDate = now.toISOString();
      
      // 사용량 리셋을 DB에 저장
      await safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .update({ usage: resetUsage })
          .eq('id', req.user.id);
      }, '사용량 리셋 저장');
    }

    // 사용자별 월간 제한 확인
    const userLimit = user.usage?.monthly_limit || 10;
    let canGenerate = true;
    let limit = userLimit;

    if (userLimit === 999999) {
      // 무제한 사용자
      limit = '무제한';
    } else {
      // 일반 사용자 - 월간 제한 확인
      canGenerate = resetUsage.currentMonth < userLimit;
    }

    // 다음 리셋 날짜 계산
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextResetDate - now) / (1000 * 60 * 60 * 24));

    const responseData = {
      success: true,
      usage: {
        currentMonth: resetUsage.currentMonth,
        totalGenerated: resetUsage.totalGenerated,
        limit: limit,
        canGenerate: canGenerate,
        planType: subscription.plan,
        nextResetDate: nextResetDate.toISOString(),
        daysUntilReset: daysUntilReset
      }
    };

    console.log('✅ 사용량 정보 조회 완료:', {
      currentMonth: resetUsage.currentMonth,
      limit: limit,
      canGenerate: canGenerate,
      planType: subscription.plan
    });

    console.log('📤 응답 데이터 전송:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ 사용량 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 AI 스크립트 목록 조회 (대본함용)
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    console.log('📚 저장된 AI 스크립트 목록 조회 요청:', req.user.id);
    
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_saved', true)  // 저장된 스크립트만 조회
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, '저장된 AI 스크립트 목록 조회');

    if (!result.success) {
      console.error('❌ 저장된 AI 스크립트 목록 조회 실패:', result.error);
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    console.log(`✅ 저장된 AI 스크립트 목록 조회 완료: ${result.data.length}개`);
    
    res.json({
      success: true,
      scripts: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.data.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ 저장된 AI 스크립트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '저장된 스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자의 AI 스크립트 목록 조회 (호환성을 위한 별칭)
router.get('/scripts', authenticateToken, async (req, res) => {
  try {
    console.log('📋 AI 스크립트 목록 조회 요청:', req.user.id);
    
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, 'AI 스크립트 목록 조회');

    if (!result.success) {
      console.error('❌ AI 스크립트 목록 조회 실패:', result.error);
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    console.log(`✅ AI 스크립트 목록 조회 완료: ${result.data.length}개`);
    
    res.json({
      success: true,
      scripts: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.data.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ AI 스크립트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 스크립트 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자의 AI 스크립트 목록 조회 (새로운 엔드포인트는 /scripts 사용을 권장)
// /my-scripts는 향후 지원 중단 예정

// AI 스크립트 상세 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await safeQuery(async () => {
      return await supabase
        .from('ai_scripts')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 상세 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      script: result.data
    });

  } catch (error) {
    console.error('AI 스크립트 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await safeQuery(async () => {
      return await supabase
        .from('ai_scripts')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);
    }, 'AI 스크립트 삭제');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'AI 스크립트가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('AI 스크립트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 스크립트 삭제 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 공개 설정 변경
router.patch('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const result = await safeQuery(async () => {
      return await supabase
        .from('ai_scripts')
        .update({ is_public: isPublic })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, 'AI 스크립트 공개 설정 변경');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      message: `스크립트가 ${isPublic ? '공개' : '비공개'}로 설정되었습니다.`,
      script: result.data
    });

  } catch (error) {
    console.error('AI 스크립트 공개 설정 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '공개 설정 변경 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;