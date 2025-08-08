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
    const uploadPath = path.join(__dirname, '../uploads/model-recruitments');
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

// 모든 모델 모집 조회 (필터링, 검색, 정렬 지원)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      category,
      location,
      experience,
      genderRequired,
      ageMin,
      ageMax,
      heightMin,
      heightMax,
      payMin,
      payMax,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      isUrgent
    } = req.query;

    console.log('🔍 모델 모집 조회 요청:', { page, limit, type, category, location });

    // 기본 쿼리 구성
    let query = supabaseAdmin
      .from('model_recruitments')
      .select(`
        *,
        users!model_recruitments_user_id_fkey (
          id,
          email,
          username
        )
      `)
      .eq('is_active', true);

    // 필터 적용
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (location && location !== 'all') {
      query = query.eq('location', location);
    }
    if (experience && experience !== 'all') {
      query = query.eq('experience_required', experience);
    }
    if (genderRequired && genderRequired !== 'all') {
      query = query.eq('gender_required', genderRequired);
    }
    if (ageMin) {
      query = query.gte('age_min', parseInt(ageMin));
    }
    if (ageMax) {
      query = query.lte('age_max', parseInt(ageMax));
    }
    if (heightMin) {
      query = query.gte('height_min', parseInt(heightMin));
    }
    if (heightMax) {
      query = query.lte('height_max', parseInt(heightMax));
    }
    if (payMin) {
      query = query.gte('pay_min', parseInt(payMin));
    }
    if (payMax) {
      query = query.lte('pay_max', parseInt(payMax));
    }
    if (isUrgent === 'true') {
      query = query.eq('is_urgent', true);
    }

    // 검색 조건
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // 정렬
    const ascending = sortOrder === 'asc';
    if (sortBy === 'deadline') {
      query = query.order('deadline', { ascending });
    } else {
      query = query.order(sortBy, { ascending });
    }

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const result = await safeQuery(async () => query, '모델 모집 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '모델 모집 공고 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from('model_recruitments')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 동일한 필터 적용
    if (type && type !== 'all') countQuery = countQuery.eq('type', type);
    if (category && category !== 'all') countQuery = countQuery.eq('category', category);
    if (location && location !== 'all') countQuery = countQuery.eq('location', location);
    if (experience && experience !== 'all') countQuery = countQuery.eq('experience_required', experience);
    if (genderRequired && genderRequired !== 'all') countQuery = countQuery.eq('gender_required', genderRequired);
    if (ageMin) countQuery = countQuery.gte('age_min', parseInt(ageMin));
    if (ageMax) countQuery = countQuery.lte('age_max', parseInt(ageMax));
    if (heightMin) countQuery = countQuery.gte('height_min', parseInt(heightMin));
    if (heightMax) countQuery = countQuery.lte('height_max', parseInt(heightMax));
    if (payMin) countQuery = countQuery.gte('pay_min', parseInt(payMin));
    if (payMax) countQuery = countQuery.lte('pay_max', parseInt(payMax));
    if (isUrgent === 'true') countQuery = countQuery.eq('is_urgent', true);
    if (search) countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%,company.ilike.%${search}%`);

    const countResult = await safeQuery(async () => countQuery, '모델 모집 공고 개수 조회');
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
    console.error('❌ 모델 모집 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 모델 모집 공고 조회
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 특정 모델 모집 조회:', id);

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .select(`
          *,
          users!model_recruitments_user_id_fkey (
            id,
            email,
            username
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();
    }, '특정 모델 모집 조회');

    if (!result.success) {
      if (result.error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: '모델 모집 공고를 찾을 수 없습니다.'
        });
      }
      return res.status(500).json({
        success: false,
        message: '모델 모집 공고 조회 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    // 조회수 증가
    await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .update({ views: (result.data.views || 0) + 1 })
        .eq('id', id);
    }, '모델 모집 공고 조회수 증가');

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ 특정 모델 모집 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모델 모집 공고 생성
router.post('/', authenticateToken, upload.array('images', 7), async (req, res) => {
  try {
    console.log('📝 모델 모집 공고 생성:', req.user.id);
    console.log('📋 요청 데이터:', req.body);

    const {
      title,
      content,
      type,
      category,
      company,
      location,
      experience_required,
      gender_required,
      age_min,
      age_max,
      height_min,
      height_max,
      weight_min,
      weight_max,
      pay_type,
      pay_min,
      pay_max,
      deadline,
      contact,
      requirements,
      is_urgent
    } = req.body;

    // 필수 필드 검증
    if (!title || !content || !type) {
      return res.status(400).json({
        success: false,
        message: '제목, 내용, 모집 유형은 필수 입력 사항입니다.'
      });
    }

    // 다중 이미지 처리
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        url: `/uploads/model-recruitments/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      }));
      console.log('📷 업로드된 이미지들:', images);
    }

    // requirements가 문자열이면 배열로 변환
    let requirementsArray = [];
    if (requirements) {
      try {
        requirementsArray = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;
      } catch (e) {
        requirementsArray = typeof requirements === 'string' ? [requirements] : requirements || [];
      }
    }

    const recruitmentData = {
      user_id: req.user.id,
      title,
      content,
      type,
      category: category || '',
      company: company || '',
      location: location || '서울',
      experience_required: experience_required || '무관',
      gender_required: gender_required || '무관',
      age_min: age_min ? parseInt(age_min) : null,
      age_max: age_max ? parseInt(age_max) : null,
      height_min: height_min ? parseInt(height_min) : null,
      height_max: height_max ? parseInt(height_max) : null,
      weight_min: weight_min ? parseInt(weight_min) : null,
      weight_max: weight_max ? parseInt(weight_max) : null,
      pay_type: pay_type || '협의',
      pay_min: pay_min ? parseInt(pay_min) : null,
      pay_max: pay_max ? parseInt(pay_max) : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      contact: contact || '',
      requirements: requirementsArray,
      is_urgent: is_urgent === 'true' || is_urgent === true,
      images: images,
      is_active: true,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .insert(recruitmentData)
        .select()
        .single();
    }, '모델 모집 공고 생성');

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
        message: '모델 모집 공고 생성 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '모델 모집 공고가 성공적으로 생성되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 모델 모집 공고 생성 오류:', error);
    
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

// 모델 모집 공고 수정
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ 모델 모집 공고 수정:', id, 'by', req.user.id);

    // 공고 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .select('user_id, image_url')
        .eq('id', id)
        .single();
    }, '모델 모집 공고 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '모델 모집 공고를 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 모델 모집 공고를 수정할 권한이 없습니다.'
      });
    }

    const {
      title,
      content,
      type,
      category,
      company,
      location,
      experience_required,
      gender_required,
      age_min,
      age_max,
      height_min,
      height_max,
      weight_min,
      weight_max,
      pay_type,
      pay_min,
      pay_max,
      deadline,
      contact,
      requirements,
      is_urgent
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
      
      imageUrl = `/uploads/model-recruitments/${req.file.filename}`;
      console.log('📷 새 이미지 업로드:', imageUrl);
    }

    // requirements가 문자열이면 배열로 변환
    let requirementsArray = [];
    if (requirements !== undefined) {
      try {
        requirementsArray = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;
      } catch (e) {
        requirementsArray = typeof requirements === 'string' ? [requirements] : requirements || [];
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // 제공된 필드만 업데이트
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location;
    if (experience_required !== undefined) updateData.experience_required = experience_required;
    if (gender_required !== undefined) updateData.gender_required = gender_required;
    if (age_min !== undefined) updateData.age_min = age_min ? parseInt(age_min) : null;
    if (age_max !== undefined) updateData.age_max = age_max ? parseInt(age_max) : null;
    if (height_min !== undefined) updateData.height_min = height_min ? parseInt(height_min) : null;
    if (height_max !== undefined) updateData.height_max = height_max ? parseInt(height_max) : null;
    if (weight_min !== undefined) updateData.weight_min = weight_min ? parseInt(weight_min) : null;
    if (weight_max !== undefined) updateData.weight_max = weight_max ? parseInt(weight_max) : null;
    if (pay_type !== undefined) updateData.pay_type = pay_type;
    if (pay_min !== undefined) updateData.pay_min = pay_min ? parseInt(pay_min) : null;
    if (pay_max !== undefined) updateData.pay_max = pay_max ? parseInt(pay_max) : null;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline).toISOString() : null;
    if (contact !== undefined) updateData.contact = contact;
    if (requirements !== undefined) updateData.requirements = requirementsArray;
    if (is_urgent !== undefined) updateData.is_urgent = is_urgent === 'true' || is_urgent === true;
    if (imageUrl !== ownershipResult.data.image_url) updateData.image_url = imageUrl;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    }, '모델 모집 공고 수정');

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
        message: '모델 모집 공고 수정 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '모델 모집 공고가 성공적으로 수정되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('❌ 모델 모집 공고 수정 오류:', error);
    
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

// 모델 모집 공고 삭제 (비활성화)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 모델 모집 공고 삭제:', id, 'by', req.user.id);

    // 공고 소유권 확인
    const ownershipResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .select('user_id')
        .eq('id', id)
        .single();
    }, '모델 모집 공고 소유권 확인');

    if (!ownershipResult.success) {
      return res.status(404).json({
        success: false,
        message: '모델 모집 공고를 찾을 수 없습니다.'
      });
    }

    if (ownershipResult.data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '이 모델 모집 공고를 삭제할 권한이 없습니다.'
      });
    }

    // 소프트 삭제 (is_active = false)
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('model_recruitments')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
    }, '모델 모집 공고 비활성화');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '모델 모집 공고 삭제 중 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: '모델 모집 공고가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 모델 모집 공고 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
