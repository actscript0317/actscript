const express = require('express');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken, optionalAuth } = require('../middleware/supabaseAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/community');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname);
    
    if (!ext) {
      if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) {
        ext = '.jpg';
      } else if (file.mimetype.includes('png')) {
        ext = '.png';
      } else if (file.mimetype.includes('webp')) {
        ext = '.webp';
      } else {
        ext = '.jpg';
      }
    }
    
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 모든 커뮤니티 포스트 조회 (필터링, 검색, 정렬 지원)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      board,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      isPinned
    } = req.query;

    console.log('🔍 커뮤니티 포스트 조회 요청:', { page, limit, category, board });

    // 기본 쿼리 구성
    let query = supabaseAdmin
      .from('community_posts')
      .select(`
        *,
        users!community_posts_user_id_fkey (
          id,
          email,
          username
        )
      `)
      .eq('is_active', true);

    // 필터 적용
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (board && board !== 'all') {
      query = query.eq('board', board);
    }
    if (isPinned === 'true') {
      query = query.eq('is_pinned', true);
    }

    // 검색 조건
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 정렬 (핀된 포스트가 항상 먼저 오도록)
    const ascending = sortOrder === 'asc';
    query = query.order('is_pinned', { ascending: false });
    query = query.order(sortBy, { ascending });

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => query, '커뮤니티 포스트 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '커뮤니티 포스트 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 동일한 필터 적용
    if (category && category !== 'all') countQuery = countQuery.eq('category', category);
    if (board && board !== 'all') countQuery = countQuery.eq('board', board);
    if (isPinned === 'true') countQuery = countQuery.eq('is_pinned', true);
    if (search) countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const countResult = await safeQuery(async () => countQuery, '커뮤니티 포스트 개수 조회');
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
    console.error('❌ 커뮤니티 포스트 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 커뮤니티 포스트 조회
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 특정 커뮤니티 포스트 조회:', id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .select(`
          *,
          users!community_posts_user_id_fkey (
            id,
            email,
            username
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();
    }, '특정 커뮤니티 포스트 조회');

    if (!result.success) {
      if (result.error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: '포스트를 찾을 수 없습니다.'
        });
      }
      return res.status(500).json({
        success: false,
        message: '포스트 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 조회수 증가
    await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .update({ views: (result.data.views || 0) + 1 })
        .eq('id', id);
    }, '커뮤니티 포스트 조회수 증가');

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ 특정 커뮤니티 포스트 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 포스트 조회
router.get('/my/posts', authenticateToken, async (req, res) => {
  try {
    console.log('👤 내 커뮤니티 포스트 조회:', req.user.id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    }, '내 커뮤니티 포스트 조회');

    if (!result.success) {
      console.error('❌ 내 포스트 조회 실패:', result.error);
      return res.status(500).json({
        success: false,
        message: '내 포스트 조회 중 오류가 발생했습니다.',
        error: '데이터베이스 오류가 발생했습니다.'
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('❌ 내 커뮤니티 포스트 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 커뮤니티 포스트 생성
router.post('/', authenticateToken, upload.array('images', 7), async (req, res) => {
  try {
    console.log('📝 커뮤니티 포스트 생성:', req.user.id);
    console.log('📋 요청 데이터:', req.body);

    const {
      title,
      content,
      category,
      board,
      tags
    } = req.body;

    // 필수 필드 검증
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: '제목, 내용, 카테고리는 필수 입력 사항입니다.'
      });
    }

    // 다중 이미지 처리
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        url: `/uploads/community/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      }));
      console.log('📷 업로드된 이미지들:', images);
    }

    // tags가 문자열이면 배열로 변환
    let tagsArray = [];
    if (tags) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        tagsArray = typeof tags === 'string' ? [tags] : tags || [];
      }
    }

    const postData = {
      user_id: req.user.id,
      title,
      content,
      category,
      board: board || 'general',
      tags: tagsArray,
      images: images,
      is_active: true,
      is_pinned: false,
      views: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .insert(postData)
        .select()
        .single();
    }, '커뮤니티 포스트 생성');

    if (!result.success) {
      // 업로드된 파일들 삭제
      if (req.files) {
        req.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.warn('임시 파일 삭제 실패:', e.message);
          }
        });
      }

      return res.status(500).json({
        success: false,
        message: '포스트 생성 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '포스트가 성공적으로 생성되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 커뮤니티 포스트 생성 오류:', error);
    
    // 업로드된 파일들 삭제
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.warn('임시 파일 삭제 실패:', e.message);
        }
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 커뮤니티 포스트 수정
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ 커뮤니티 포스트 수정:', id, 'by', req.user.id);

    // 포스트 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .select('user_id, image_url')
        .eq('id', id)
        .single();
    }, '커뮤니티 포스트 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '포스트를 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 포스트를 수정할 권한이 없습니다.'
      });
    }

    const {
      title,
      content,
      category,
      board,
      tags
    } = req.body;

    // 이미지 처리
    let imageUrl = ownershipResult.data.image_url; // 기존 이미지 유지
    if (req.file) {
      // 기존 이미지 파일 삭제
      if (ownershipResult.data.image_url) {
        const oldImagePath = path.join(__dirname, '../', ownershipResult.data.image_url);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (e) {
          console.warn('기존 이미지 삭제 실패:', e.message);
        }
      }
      
      imageUrl = `/uploads/community/${req.file.filename}`;
      console.log('📷 새 이미지 업로드:', imageUrl);
    }

    // tags가 문자열이면 배열로 변환
    let tagsArray = [];
    if (tags !== undefined) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        tagsArray = typeof tags === 'string' ? [tags] : tags || [];
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // 제공된 필드만 업데이트
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (board !== undefined) updateData.board = board;
    if (tags !== undefined) updateData.tags = tagsArray;
    if (imageUrl !== ownershipResult.data.image_url) updateData.image_url = imageUrl;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    }, '커뮤니티 포스트 수정');

    if (!result.success) {
      // 새로 업로드된 파일 삭제
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn('임시 파일 삭제 실패:', e.message);
        }
      }

      return res.status(500).json({
        success: false,
        message: '포스트 수정 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '포스트가 성공적으로 수정되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 커뮤니티 포스트 수정 오류:', error);
    
    // 업로드된 파일 삭제
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('임시 파일 삭제 실패:', e.message);
      }
    }

    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 커뮤니티 포스트 삭제 (비활성화)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 커뮤니티 포스트 삭제:', id, 'by', req.user.id);

    // 포스트 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .select('user_id')
        .eq('id', id)
        .single();
    }, '커뮤니티 포스트 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '포스트를 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 포스트를 삭제할 권한이 없습니다.'
      });
    }

    // 소프트 삭제 (is_active = false)
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('community_posts')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
    }, '커뮤니티 포스트 비활성화');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '포스트 삭제 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '포스트가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 커뮤니티 포스트 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
