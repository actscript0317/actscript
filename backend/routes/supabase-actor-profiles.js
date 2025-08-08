const express = require('express');
const { supabase, supabaseAdmin, safeQuery, handleSupabaseError } = require('../config/supabase');
const { authenticateToken, optionalAuth } = require('../middleware/supabaseAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 파일 업로드 설정 (임시 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// 모든 프로필 조회 (필터링, 검색, 정렬 지원)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      gender,
      experience,
      location,
      specialty,
      ageMin,
      ageMax,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 배우 프로필 조회 요청:', { page, limit, gender, experience, location, specialty });

    // 기본 쿼리 구성
    let query = supabaseAdmin
      .from('actor_profiles')
      .select(`
        *,
        users!actor_profiles_user_id_fkey (
          id,
          email,
          username
        )
      `)
;

    // 필터 적용
    if (gender && gender !== 'all') {
      query = query.eq('gender', gender);
    }
    if (experience && experience !== 'all') {
      query = query.eq('experience', experience);
    }
    if (location && location !== 'all') {
      query = query.eq('location', location);
    }
    if (specialty && specialty !== 'all') {
      query = query.contains('specialty', [specialty]);
    }

    // 검색 조건
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // 정렬
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => query, '배우 프로필 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '프로필 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('actor_profiles')
      .select('*', { count: 'exact', head: true })
;

    // 동일한 필터 적용
    if (gender && gender !== 'all') countQuery = countQuery.eq('gender', gender);
    if (experience && experience !== 'all') countQuery = countQuery.eq('experience', experience);
    if (location && location !== 'all') countQuery = countQuery.eq('location', location);
    if (specialty && specialty !== 'all') countQuery = countQuery.contains('specialty', [specialty]);
    if (search) countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%,name.ilike.%${search}%`);

    const countResult = await safeQuery(async () => countQuery, '프로필 개수 조회');
    const total = countResult.success ? countResult.count : 0;

    // 각 프로필에 대한 좋아요/북마크 수 추가 (추후 구현)
    const profilesWithCounts = (result.data || []).map(profile => ({
      ...profile,
      likes: 0, // 추후 구현
      bookmarks: 0 // 추후 구현
    }));

    res.json({
      success: true,
      data: profilesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ 배우 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 프로필 조회
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 특정 배우 프로필 조회:', id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .select(`
          *,
          users!actor_profiles_user_id_fkey (
            id,
            email,
            username
          )
        `)
        .eq('id', id)
        .single();
    }, '특정 배우 프로필 조회');

    if (!result.success) {
      if (result.error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: '프로필을 찾을 수 없습니다.'
        });
      }
      return res.status(500).json({
        success: false,
        message: '프로필 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 조회수 증가
    await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .update({ views: (result.data.views || 0) + 1 })
        .eq('id', id);
    }, '프로필 조회수 증가');

    // 좋아요/북마크 수 추가 (추후 구현)
    const profileWithCounts = {
      ...result.data,
      likes: 0, // 추후 구현
      bookmarks: 0 // 추후 구현
    };

    res.json({
      success: true,
      data: profileWithCounts
    });

  } catch (error) {
    console.error('❌ 특정 배우 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 인기 프로필 조회
router.get('/popular/trending', optionalAuth, async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    console.log('🔥 인기 배우 프로필 조회');

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .select(`
          *,
          users!actor_profiles_user_id_fkey (
            id,
            email,
            username
          )
        `)
        .order('views', { ascending: false })
        .limit(parseInt(limit));
    }, '인기 배우 프로필 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '인기 프로필 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('❌ 인기 배우 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 프로필 조회
router.get('/my/profiles', authenticateToken, async (req, res) => {
  try {
    console.log('👤 내 배우 프로필 조회:', req.user.id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    }, '내 배우 프로필 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '내 프로필 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('❌ 내 배우 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 프로필 생성
router.post('/', authenticateToken, upload.array('images', 7), async (req, res) => {
  try {
    console.log('📝 배우 프로필 생성:', req.user.id);
    console.log('📋 요청 데이터:', req.body);

    const {
      name,
      title,
      content,
      gender,
      experience,
      location,
      specialty
    } = req.body;

    // 필수 필드 검증
    if (!name || !title || !content) {
      return res.status(400).json({
        success: false,
        message: '이름, 제목, 내용은 필수 입력 사항입니다.'
      });
    }

    // 다중 이미지 처리
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        url: `/uploads/profiles/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      }));
      console.log('📷 업로드된 이미지들:', images);
    }

    // specialty가 문자열이면 배열로 변환
    let specialtyArray = [];
    if (specialty) {
      try {
        specialtyArray = typeof specialty === 'string' ? JSON.parse(specialty) : specialty;
      } catch (e) {
        specialtyArray = typeof specialty === 'string' ? [specialty] : specialty || [];
      }
    }

    const profileData = {
      user_id: req.user.id,
      name,
      title,
      content,
      gender: gender || '기타',
      experience: experience || '신인',
      location: location || '서울',
      specialty: specialtyArray,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 이미지가 있으면 추가
    if (images && images.length > 0) {
      profileData.images = images;
    }

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .insert(profileData)
        .select()
        .single();
    }, '배우 프로필 생성');

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
        message: '프로필 생성 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '프로필이 성공적으로 생성되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 배우 프로필 생성 오류:', error);
    
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

// 프로필 수정
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ 배우 프로필 수정:', id, 'by', req.user.id);

    // 프로필 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .select('user_id, image_url')
        .eq('id', id)
        .single();
    }, '프로필 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '프로필을 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 프로필을 수정할 권한이 없습니다.'
      });
    }

    const {
      name,
      title,
      content,
      gender,
      experience,
      location,
      specialty
    } = req.body;

    // 이미지 처리
    let imageUrl = ownershipResult.data.image_url; // 기존 이미지 유지
    if (req.file) {
      // 기존 이미지 파일 삭제 (선택사항)
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
      
      imageUrl = `/uploads/profiles/${req.file.filename}`;
      console.log('📷 새 이미지 업로드:', imageUrl);
    }

    // specialty가 문자열이면 배열로 변환
    let specialtyArray = [];
    if (specialty !== undefined) {
      try {
        specialtyArray = typeof specialty === 'string' ? JSON.parse(specialty) : specialty;
      } catch (e) {
        specialtyArray = typeof specialty === 'string' ? [specialty] : specialty || [];
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // 제공된 필드만 업데이트
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (gender !== undefined) updateData.gender = gender;
    if (experience !== undefined) updateData.experience = experience;
    if (location !== undefined) updateData.location = location;
    if (specialty !== undefined) updateData.specialty = specialtyArray;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    }, '배우 프로필 수정');

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
        message: '프로필 수정 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '프로필이 성공적으로 수정되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 배우 프로필 수정 오류:', error);
    
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

// 프로필 삭제 (비활성화)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 배우 프로필 삭제:', id, 'by', req.user.id);

    // 프로필 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .select('user_id, image_url')
        .eq('id', id)
        .single();
    }, '프로필 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '프로필을 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 프로필을 삭제할 권한이 없습니다.'
      });
    }

    // 물리적 삭제
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('actor_profiles')
        .delete()
        .eq('id', id)
        .select()
        .single();
    }, '배우 프로필 삭제');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '프로필 삭제 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '프로필이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 배우 프로필 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
