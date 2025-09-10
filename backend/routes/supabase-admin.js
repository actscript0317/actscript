const express = require('express');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');

const router = express.Router();

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }

  next();
};

// 대시보드 통계 조회
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 관리자 대시보드 통계 조회:', req.user.id);

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    // 병렬로 통계 데이터 조회
    const [
      usersResult,
      todayUsersResult,
      scriptsResult,
      todayScriptsResult,
      aiScriptsResult,
      todayAiScriptsResult,
      communityPostsResult,
      todayPostsResult,
      actorProfilesResult,
      actorRecruitmentsResult,
      modelRecruitmentsResult
    ] = await Promise.all([
      // 전체 사용자 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true });
      }, '전체 사용자 수 조회'),

      // 오늘 가입한 사용자 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart);
      }, '오늘 가입 사용자 수 조회'),

      // 전체 스크립트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('scripts')
          .select('*', { count: 'exact', head: true });
      }, '전체 스크립트 수 조회'),

      // 오늘 생성된 스크립트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('scripts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart);
      }, '오늘 생성 스크립트 수 조회'),

      // 전체 AI 스크립트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('ai_scripts')
          .select('*', { count: 'exact', head: true });
      }, '전체 AI 스크립트 수 조회'),

      // 오늘 생성된 AI 스크립트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('ai_scripts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart);
      }, '오늘 생성 AI 스크립트 수 조회'),

      // 전체 커뮤니티 포스트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('community_posts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
      }, '전체 커뮤니티 포스트 수 조회'),

      // 오늘 생성된 커뮤니티 포스트 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('community_posts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('created_at', todayStart);
      }, '오늘 생성 커뮤니티 포스트 수 조회'),

      // 전체 배우 프로필 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('actor_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
      }, '전체 배우 프로필 수 조회'),

      // 전체 배우 모집 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('actor_recruitments')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
      }, '전체 배우 모집 수 조회'),

      // 전체 모델 모집 수
      safeQuery(async () => {
        return await supabaseAdmin
          .from('model_recruitments')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
      }, '전체 모델 모집 수 조회')
    ]);

    const stats = {
      users: {
        total: usersResult.success ? usersResult.count : 0,
        todayRegistered: todayUsersResult.success ? todayUsersResult.count : 0
      },
      scripts: {
        total: scriptsResult.success ? scriptsResult.count : 0,
        todayCreated: todayScriptsResult.success ? todayScriptsResult.count : 0
      },
      aiScripts: {
        total: aiScriptsResult.success ? aiScriptsResult.count : 0,
        todayGenerated: todayAiScriptsResult.success ? todayAiScriptsResult.count : 0
      },
      communityPosts: {
        total: communityPostsResult.success ? communityPostsResult.count : 0,
        todayCreated: todayPostsResult.success ? todayPostsResult.count : 0
      },
      actorProfiles: {
        total: actorProfilesResult.success ? actorProfilesResult.count : 0
      },
      actorRecruitments: {
        total: actorRecruitmentsResult.success ? actorRecruitmentsResult.count : 0
      },
      modelRecruitments: {
        total: modelRecruitmentsResult.success ? modelRecruitmentsResult.count : 0
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 관리자 대시보드 통계 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용자 목록 조회 (관리자용)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    console.log('👥 관리자 사용자 목록 조회:', req.user.id);

    let query = supabaseAdmin
      .from('users')
      .select('id, username, email, role, subscription, usage, created_at, updated_at, last_login_at');

    // 검색 조건
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 역할 필터
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // 페이지네이션 및 정렬
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => query, '사용자 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role && role !== 'all') {
      countQuery = countQuery.eq('role', role);
    }

    const countResult = await safeQuery(async () => countQuery, '사용자 수 조회');
    const total = countResult.success ? countResult.count : 0;

    res.json({
      success: true,
      data: result.data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ 관리자 사용자 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용자 역할 변경
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    console.log('🔄 사용자 역할 변경:', id, 'to', role, 'by', req.user.id);

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 역할입니다.'
      });
    }

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .update({ 
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, username, email, role')
        .single();
    }, '사용자 역할 변경');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용자 역할 변경 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: `사용자 역할이 ${role}로 변경되었습니다.`,
      data: result.data
    });

  } catch (error) {
    console.error('❌ 사용자 역할 변경 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용자 비활성화/활성화
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    console.log('🔄 사용자 상태 변경:', id, 'to', is_active, 'by', req.user.id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .update({ 
          is_active: is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, username, email, is_active')
        .single();
    }, '사용자 상태 변경');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용자 상태 변경 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: `사용자가 ${is_active ? '활성화' : '비활성화'}되었습니다.`,
      data: result.data
    });

  } catch (error) {
    console.error('❌ 사용자 상태 변경 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 콘텐츠 관리 (스크립트, 포스트 등의 관리)
router.get('/content', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, page = 1, limit = 20, search } = req.query;
    console.log('📄 관리자 콘텐츠 조회:', type, 'by', req.user.id);

    let result;
    let table;
    let selectFields = '*';

    switch (type) {
      case 'scripts':
        table = 'scripts';
        selectFields = 'id, title, character_count, gender, mood, views, created_at, users!scripts_user_id_fkey(username, email)';
        break;
      case 'ai_scripts':
        table = 'ai_scripts';
        selectFields = 'id, title, character_count, genre, created_at, users!ai_scripts_user_id_fkey(username, email)';
        break;
      case 'community_posts':
        table = 'community_posts';
        selectFields = 'id, title, category, views, likes_count, is_pinned, created_at, users!community_posts_user_id_fkey(username, email)';
        break;
      case 'actor_profiles':
        table = 'actor_profiles';
        selectFields = 'id, name, title, views, is_active, created_at, users!actor_profiles_user_id_fkey(username, email)';
        break;
      case 'actor_recruitments':
        table = 'actor_recruitments';
        selectFields = 'id, title, type, views, is_urgent, deadline, created_at, users!actor_recruitments_user_id_fkey(username, email)';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 콘텐츠 타입입니다.'
        });
    }

    let query = supabaseAdmin
      .from(table)
      .select(selectFields);

    // 검색 조건
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 페이지네이션 및 정렬
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    result = await safeQuery(async () => query, `${type} 목록 조회`);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '콘텐츠 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('❌ 관리자 콘텐츠 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용량 정보 조회 API (일반 사용자용 - 관리자 권한 불필요)
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    console.log('📊 사용량 정보 조회 요청:', req.user.id);
    
    const userResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용량 조회용 사용자 정보');

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
      
      await safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .update({ usage: resetUsage })
          .eq('id', req.user.id);
      }, '사용량 리셋 저장');
    }

    const userLimit = user.usage?.monthly_limit || 10;
    let canGenerate = true;
    let limit = userLimit;

    if (userLimit === 999999) {
      limit = '무제한';
    } else {
      canGenerate = resetUsage.currentMonth < userLimit;
    }

    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextResetDate - now) / (1000 * 60 * 60 * 24));

    res.json({
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
    });

    console.log('✅ 사용량 정보 조회 완료:', {
      currentMonth: resetUsage.currentMonth,
      limit: limit,
      canGenerate: canGenerate
    });

  } catch (error) {
    console.error('❌ 사용량 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
