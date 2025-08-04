const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken, optionalAuth, requireOwnership } = require('../middleware/supabaseAuth');
const router = express.Router();

// 검증 규칙
const createScriptValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('제목은 1-255자 사이여야 합니다.'),
  body('characterCount').isInt({ min: 1, max: 10 }).withMessage('인물 수는 1-10 사이여야 합니다.'),
  body('situation').trim().isLength({ min: 1 }).withMessage('상황 설명이 필요합니다.'),
  body('content').trim().isLength({ min: 1 }).withMessage('대본 내용이 필요합니다.'),
  body('emotions').isArray({ min: 1 }).withMessage('최소 1개의 감정을 선택해야 합니다.'),
  body('mood').isIn(['감정적인', '코믹한', '진지한', '로맨스', '스릴러', '판타지', 'SF', '시대극']).withMessage('올바른 분위기를 선택하세요.'),
  body('duration').isIn(['30초 이하', '1분 이하', '1~3분', '3~5분', '5분 이상']).withMessage('올바른 시간을 선택하세요.'),
  body('ageGroup').isIn(['10대', '20대', '30대', '40대 이상']).withMessage('올바른 연령대를 선택하세요.'),
  body('purpose').isIn(['오디션', '연기 연습', '영상 제작', '수업/교육', '기타']).withMessage('올바른 용도를 선택하세요.'),
  body('scriptType').isIn(['상황극', '독백', '대화', '내레이션']).withMessage('올바른 대본 유형을 선택하세요.')
];

// AI 생성 스크립트 조회 (인증 필요)
router.get('/ai', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const result = await safeQuery(async () => {
      return await supabase
        .from('ai_scripts')
        .select(`
          *,
          users!ai_scripts_user_id_fkey(username, name)
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, 'AI 스크립트 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

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
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 북마크된 스크립트 조회 (인증 필요)
router.get('/bookmarked', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const result = await safeQuery(async () => {
      return await supabase
        .from('bookmarks')
        .select(`
          created_at,
          scripts!bookmarks_script_id_fkey(*),
          ai_scripts!bookmarks_ai_script_id_fkey(*)
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, '북마크된 스크립트 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    // Flatten the bookmarks to scripts
    const scripts = result.data.map(bookmark => ({
      ...bookmark.scripts || bookmark.ai_scripts,
      bookmarked_at: bookmark.created_at,
      type: bookmark.scripts ? 'public' : 'ai'
    }));

    res.json({
      success: true,
      scripts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.data.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('북마크된 스크립트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '북마크된 스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 모든 대본 조회 (필터링, 검색, 페이지네이션 포함)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      emotion, 
      gender, 
      mood, 
      duration, 
      ageGroup, 
      purpose, 
      scriptType,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('scripts')
      .select(`
        *,
        users!scripts_author_id_fkey(username, name)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,situation.ilike.%${search}%`);
    }
    
    if (emotion) {
      query = query.contains('emotions', [emotion]);
    }
    
    if (gender && gender !== '전체') {
      query = query.eq('gender', gender);
    }
    
    if (mood) {
      query = query.eq('mood', mood);
    }
    
    if (duration) {
      query = query.eq('duration', duration);
    }
    
    if (ageGroup) {
      query = query.eq('age_group', ageGroup);
    }
    
    if (purpose) {
      query = query.eq('purpose', purpose);
    }
    
    if (scriptType) {
      query = query.eq('script_type', scriptType);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => await query, '스크립트 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      scripts: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.data.length, // Note: count would be in result.count if using count: 'exact'
        hasMore: result.data.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('스크립트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 단일 스크립트 조회 (조회수 증가)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 스크립트 조회
    const result = await safeQuery(async () => {
      return await supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `)
        .eq('id', id)
        .single();
    }, '스크립트 상세 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    // 조회수 증가 (비동기로 처리, 실패해도 응답에 영향 없음)
    supabase
      .from('scripts')
      .update({ views: result.data.views + 1 })
      .eq('id', id)
      .then()
      .catch(error => console.error('조회수 증가 실패:', error));

    // 북마크 상태 확인 (로그인한 사용자의 경우)
    let isBookmarked = false;
    if (req.user) {
      const bookmarkResult = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('script_id', id)
        .single();
      
      isBookmarked = !bookmarkResult.error;
    }

    res.json({
      success: true,
      script: {
        ...result.data,
        views: result.data.views + 1, // 증가된 조회수 반영
        isBookmarked
      }
    });

  } catch (error) {
    console.error('스크립트 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 스크립트 생성 (인증 필요)
router.post('/', authenticateToken, createScriptValidation, async (req, res) => {
  try {
    // 검증 오류 확인
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const {
      title,
      characterCount,
      situation,
      content,
      emotions,
      gender = '전체',
      mood,
      duration,
      ageGroup,
      purpose,
      scriptType
    } = req.body;

    // 사용자 정보 조회
    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('username, name')
        .eq('id', req.user.id)
        .single();
    }, '사용자 정보 조회');

    if (!userResult.success) {
      return res.status(userResult.error.code).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }

    const scriptData = {
      title,
      character_count: characterCount,
      situation,
      content,
      emotions,
      gender,
      mood,
      duration,
      age_group: ageGroup,
      purpose,
      script_type: scriptType,
      author_name: userResult.data.name,
      author_username: userResult.data.username,
      author_id: req.user.id
    };

    const result = await safeQuery(async () => {
      return await supabase
        .from('scripts')
        .insert(scriptData)
        .select()
        .single();
    }, '스크립트 생성');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '스크립트가 성공적으로 생성되었습니다.',
      script: result.data
    });

  } catch (error) {
    console.error('스크립트 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크립트 생성 중 오류가 발생했습니다.'
    });
  }
});

// 스크립트 수정 (인증 필요, 작성자만)
router.put('/:id', authenticateToken, requireOwnership('scripts'), createScriptValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      title,
      characterCount,
      situation,
      content,
      emotions,
      gender,
      mood,
      duration,
      ageGroup,
      purpose,
      scriptType
    } = req.body;

    const updateData = {
      title,
      character_count: characterCount,
      situation,
      content,
      emotions,
      gender,
      mood,
      duration,
      age_group: ageGroup,
      purpose,
      script_type: scriptType,
      updated_at: new Date().toISOString()
    };

    const result = await safeQuery(async () => {
      return await supabase
        .from('scripts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    }, '스크립트 수정');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      message: '스크립트가 성공적으로 수정되었습니다.',
      script: result.data
    });

  } catch (error) {
    console.error('스크립트 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크립트 수정 중 오류가 발생했습니다.'
    });
  }
});

// 스크립트 삭제 (인증 필요, 작성자만)
router.delete('/:id', authenticateToken, requireOwnership('scripts'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await safeQuery(async () => {
      return await supabase
        .from('scripts')
        .delete()
        .eq('id', id);
    }, '스크립트 삭제');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      message: '스크립트가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('스크립트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크립트 삭제 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 삭제 (인증 필요, 소유자만)
router.delete('/ai/:id', authenticateToken, requireOwnership('ai_scripts'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await safeQuery(async () => {
      return await supabase
        .from('ai_scripts')
        .delete()
        .eq('id', id);
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

module.exports = router;