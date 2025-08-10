const express = require('express');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');

const router = express.Router();

// 북마크 목록 조회 공통 로직
const getMyBookmarks = async (req, res) => {
  try {
    const { page = 1, limit = 12, type } = req.query;
    console.log('🔖 북마크 목록 조회:', req.user.id);

    // 먼저 간단한 쿼리로 북마크만 가져오기
    let query = supabaseAdmin
      .from('bookmarks')
      .select('*')
      .eq('user_id', req.user.id);

    // 타입별 필터링
    if (type && type !== 'all') {
      switch (type) {
        case 'script':
          query = query.not('script_id', 'is', null);
          break;
        case 'ai_script':
          query = query.not('ai_script_id', 'is', null);
          break;
        case 'actor_profile':
          query = query.not('actor_profile_id', 'is', null);
          break;
        case 'actor_recruitment':
          query = query.not('actor_recruitment_id', 'is', null);
          break;
        case 'community_post':
          query = query.not('community_post_id', 'is', null);
          break;
      }
    }

    // 페이지네이션 및 정렬
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => query, '북마크 목록 조회');

    if (!result.success) {
      console.error('❌ 북마크 조회 실패:', result.error);
      return res.status(500).json({
        success: false,
        message: '북마크 조회 중 오류가 발생했습니다.',
        error: '데이터베이스 오류가 발생했습니다.'
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (type && type !== 'all') {
      switch (type) {
        case 'script':
          countQuery = countQuery.not('script_id', 'is', null);
          break;
        case 'ai_script':
          countQuery = countQuery.not('ai_script_id', 'is', null);
          break;
        case 'actor_profile':
          countQuery = countQuery.not('actor_profile_id', 'is', null);
          break;
        case 'actor_recruitment':
          countQuery = countQuery.not('actor_recruitment_id', 'is', null);
          break;
        case 'community_post':
          countQuery = countQuery.not('community_post_id', 'is', null);
          break;
      }
    }

    const countResult = await safeQuery(async () => countQuery, '북마크 개수 조회');
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
    console.error('❌ 북마크 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
};

// 사용자의 북마크 목록 조회 (기본 엔드포인트)
router.get('/', authenticateToken, getMyBookmarks);

// 사용자의 북마크 목록 조회 (별칭 엔드포인트)
router.get('/my-bookmarks', authenticateToken, getMyBookmarks);

// 북마크 추가
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('➕ 북마크 추가:', req.user.id);
    console.log('📋 요청 데이터:', req.body);

    const {
      script_id,
      ai_script_id,
      actor_profile_id,
      actor_recruitment_id,
      model_recruitment_id,
      community_post_id
    } = req.body;

    // 적어도 하나의 ID는 제공되어야 함
    const providedIds = [script_id, ai_script_id, actor_profile_id, actor_recruitment_id, model_recruitment_id, community_post_id].filter(Boolean);
    if (providedIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: '정확히 하나의 항목 ID만 제공해야 합니다.'
      });
    }

    // 중복 북마크 확인
    let checkQuery = supabaseAdmin
      .from('bookmarks')
      .select('id')
      .eq('user_id', req.user.id);

    if (script_id) checkQuery = checkQuery.eq('script_id', script_id);
    if (ai_script_id) checkQuery = checkQuery.eq('ai_script_id', ai_script_id);
    if (actor_profile_id) checkQuery = checkQuery.eq('actor_profile_id', actor_profile_id);
    if (actor_recruitment_id) checkQuery = checkQuery.eq('actor_recruitment_id', actor_recruitment_id);
    if (model_recruitment_id) checkQuery = checkQuery.eq('model_recruitment_id', model_recruitment_id);
    if (community_post_id) checkQuery = checkQuery.eq('community_post_id', community_post_id);

    const existingBookmark = await safeQuery(async () => checkQuery.single(), '기존 북마크 확인');
    
    if (existingBookmark.success) {
      return res.status(409).json({
        success: false,
        message: '이미 북마크에 추가된 항목입니다.'
      });
    }

    const bookmarkData = {
      user_id: req.user.id,
      script_id: script_id || null,
      ai_script_id: ai_script_id || null,
      actor_profile_id: actor_profile_id || null,
      actor_recruitment_id: actor_recruitment_id || null,
      model_recruitment_id: model_recruitment_id || null,
      community_post_id: community_post_id || null,
      created_at: new Date().toISOString()
    };

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('bookmarks')
        .insert(bookmarkData)
        .select()
        .single();
    }, '북마크 추가');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '북마크 추가 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '북마크가 성공적으로 추가되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 북마크 추가 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 북마크 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('➖ 북마크 삭제:', id, 'by', req.user.id);

    // 북마크 소유권 확인 및 삭제
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, '북마크 삭제');

    if (!result.success) {
      if (result.error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: '북마크를 찾을 수 없습니다.'
        });
      }
      return res.status(500).json({
        success: false,
        message: '북마크 삭제 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '북마크가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 북마크 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 항목의 북마크 상태 확인
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const {
      script_id,
      ai_script_id,
      actor_profile_id,
      actor_recruitment_id,
      model_recruitment_id,
      community_post_id
    } = req.query;

    console.log('🔍 북마크 상태 확인:', req.user.id);

    let query = supabaseAdmin
      .from('bookmarks')
      .select('id')
      .eq('user_id', req.user.id);

    if (script_id) query = query.eq('script_id', script_id);
    if (ai_script_id) query = query.eq('ai_script_id', ai_script_id);
    if (actor_profile_id) query = query.eq('actor_profile_id', actor_profile_id);
    if (actor_recruitment_id) query = query.eq('actor_recruitment_id', actor_recruitment_id);
    if (model_recruitment_id) query = query.eq('model_recruitment_id', model_recruitment_id);
    if (community_post_id) query = query.eq('community_post_id', community_post_id);

    const result = await safeQuery(async () => query.single(), '북마크 상태 확인');

    res.json({
      success: true,
      isBookmarked: result.success,
      bookmarkId: result.success ? result.data.id : null
    });

  } catch (error) {
    console.error('❌ 북마크 상태 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
