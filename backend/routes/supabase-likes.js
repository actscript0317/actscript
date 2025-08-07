const express = require('express');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');

const router = express.Router();

// 좋아요 추가
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('👍 좋아요 추가:', req.user.id);
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

    // 중복 좋아요 확인
    let checkQuery = supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', req.user.id);

    if (script_id) checkQuery = checkQuery.eq('script_id', script_id);
    if (ai_script_id) checkQuery = checkQuery.eq('ai_script_id', ai_script_id);
    if (actor_profile_id) checkQuery = checkQuery.eq('actor_profile_id', actor_profile_id);
    if (actor_recruitment_id) checkQuery = checkQuery.eq('actor_recruitment_id', actor_recruitment_id);
    if (model_recruitment_id) checkQuery = checkQuery.eq('model_recruitment_id', model_recruitment_id);
    if (community_post_id) checkQuery = checkQuery.eq('community_post_id', community_post_id);

    const existingLike = await safeQuery(async () => checkQuery.single(), '기존 좋아요 확인');
    
    if (existingLike.success) {
      return res.status(409).json({
        success: false,
        message: '이미 좋아요를 누른 항목입니다.'
      });
    }

    const likeData = {
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
        .from('likes')
        .insert(likeData)
        .select()
        .single();
    }, '좋아요 추가');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '좋아요 추가 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 관련 테이블의 좋아요 수 증가
    if (community_post_id) {
      await safeQuery(async () => {
        return await supabaseAdmin.rpc('increment_likes_count', {
          post_id: community_post_id
        });
      }, '커뮤니티 포스트 좋아요 수 증가');
    }

    res.status(201).json({
      success: true,
      message: '좋아요가 성공적으로 추가되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 좋아요 추가 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 좋아요 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👎 좋아요 삭제:', id, 'by', req.user.id);

    // 좋아요 정보 조회 후 삭제
    const likeResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('likes')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();
    }, '좋아요 정보 조회');

    if (!likeResult.success) {
      return res.status(404).json({
        success: false,
        message: '좋아요를 찾을 수 없습니다.'
      });
    }

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('likes')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, '좋아요 삭제');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '좋아요 삭제 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 관련 테이블의 좋아요 수 감소
    if (likeResult.data.community_post_id) {
      await safeQuery(async () => {
        return await supabaseAdmin.rpc('decrement_likes_count', {
          post_id: likeResult.data.community_post_id
        });
      }, '커뮤니티 포스트 좋아요 수 감소');
    }

    res.json({
      success: true,
      message: '좋아요가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 좋아요 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 항목의 좋아요 상태 확인
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

    console.log('🔍 좋아요 상태 확인:', req.user.id);

    let query = supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', req.user.id);

    if (script_id) query = query.eq('script_id', script_id);
    if (ai_script_id) query = query.eq('ai_script_id', ai_script_id);
    if (actor_profile_id) query = query.eq('actor_profile_id', actor_profile_id);
    if (actor_recruitment_id) query = query.eq('actor_recruitment_id', actor_recruitment_id);
    if (model_recruitment_id) query = query.eq('model_recruitment_id', model_recruitment_id);
    if (community_post_id) query = query.eq('community_post_id', community_post_id);

    const result = await safeQuery(async () => query.single(), '좋아요 상태 확인');

    res.json({
      success: true,
      isLiked: result.success,
      likeId: result.success ? result.data.id : null
    });

  } catch (error) {
    console.error('❌ 좋아요 상태 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용자의 좋아요 목록 조회
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, type } = req.query;
    console.log('❤️ 내 좋아요 목록 조회:', req.user.id);

    let query = supabaseAdmin
      .from('likes')
      .select(`
        *,
        scripts!likes_script_id_fkey (
          id,
          title,
          character_count,
          gender,
          mood,
          created_at
        ),
        ai_scripts!likes_ai_script_id_fkey (
          id,
          title,
          character_count,
          genre,
          created_at
        ),
        actor_profiles!likes_actor_profile_id_fkey (
          id,
          name,
          title,
          created_at
        ),
        actor_recruitments!likes_actor_recruitment_id_fkey (
          id,
          title,
          type,
          created_at
        ),
        community_posts!likes_community_post_id_fkey (
          id,
          title,
          category,
          created_at
        )
      `)
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

    const result = await safeQuery(async () => query, '좋아요 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '좋아요 목록 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('likes')
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

    const countResult = await safeQuery(async () => countQuery, '좋아요 개수 조회');
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
    console.error('❌ 좋아요 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
