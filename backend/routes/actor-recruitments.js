const express = require('express');
const router = express.Router();
const ActorRecruitment = require('../models/ActorRecruitment');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const fs = require('fs');

// uploads 디렉토리 생성 (없으면 생성)
const uploadsDir = 'uploads/recruitments/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recruitment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 모든 모집공고 조회
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      projectType,
      location,
      experience,
      paymentType,
      status = '모집중',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 필터 조건 구성
    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (projectType && projectType !== 'all') filter.projectType = projectType;
    if (location && location !== 'all') filter.location = location;
    if (experience && experience !== 'all') filter.experience = experience;
    if (paymentType && paymentType !== 'all') filter['payment.type'] = paymentType;

    // 검색 조건
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 정렬 조건
    const sort = {};
    if (sortBy === 'deadline') {
      sort.applicationDeadline = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'urgent') {
      sort.isUrgent = -1;
      sort.createdAt = -1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const recruitments = await ActorRecruitment.find(filter)
      .populate('userId', 'email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await ActorRecruitment.countDocuments(filter);

    res.json({
      success: true,
      data: recruitments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('모집공고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 모집공고 조회
router.get('/:id', async (req, res) => {
  try {
    const recruitment = await ActorRecruitment.findById(req.params.id)
      .populate('userId', 'email')
      .lean();

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '모집공고를 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await ActorRecruitment.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: recruitment
    });
  } catch (error) {
    console.error('모집공고 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모집공고 생성
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('📥 배우 모집공고 생성 요청:', {
      body: req.body,
      filesCount: req.files?.length || 0,
      userId: req.user?.id
    });

    // 원본 데이터 로깅
    console.log('📋 원본 요청 데이터:', JSON.stringify(req.body, null, 2));

    const recruitmentData = {
      ...req.body,
      userId: req.user.id
    };

    // 필수 필드 기본값 강제 설정
    if (!recruitmentData.category) {
      recruitmentData.category = '영화'; // ActorRecruitment 스키마의 enum 첫 번째 값
    }
    if (!recruitmentData.projectType) {
      recruitmentData.projectType = '상업';
    }
    if (!recruitmentData.location) {
      recruitmentData.location = '서울';
    }
    if (!recruitmentData.applicationMethod) {
      recruitmentData.applicationMethod = '이메일';
    }

    // 지원 마감일 기본값 설정 (30일 후)
    if (!recruitmentData.applicationDeadline) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      recruitmentData.applicationDeadline = futureDate.toISOString();
    } else if (typeof recruitmentData.applicationDeadline === 'string') {
      // 문자열인 경우 Date 객체로 변환
      try {
        recruitmentData.applicationDeadline = new Date(recruitmentData.applicationDeadline).toISOString();
      } catch (e) {
        console.log('날짜 변환 실패, 기본값 설정');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        recruitmentData.applicationDeadline = futureDate.toISOString();
      }
    }

    // 이미지 처리
    if (req.files && req.files.length > 0) {
      recruitmentData.images = req.files.map(file => ({
        url: `/uploads/recruitments/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
    }

    // JSON 문자열 파싱 및 기본값 처리
    if (req.body.roles && typeof req.body.roles === 'string') {
      try {
        recruitmentData.roles = JSON.parse(req.body.roles);
      } catch (e) {
        console.log('roles 파싱 실패, 빈 배열로 설정');
        recruitmentData.roles = [];
      }
    }

    if (req.body.shootingPeriod && typeof req.body.shootingPeriod === 'string') {
      try {
        recruitmentData.shootingPeriod = JSON.parse(req.body.shootingPeriod);
      } catch (e) {
        console.log('shootingPeriod 파싱 실패, 빈 객체로 설정');
        recruitmentData.shootingPeriod = {};
      }
    }

    if (req.body.payment && typeof req.body.payment === 'string') {
      try {
        recruitmentData.payment = JSON.parse(req.body.payment);
      } catch (e) {
        console.log('payment 파싱 실패, 기본값 설정');
        recruitmentData.payment = {};
      }
    }
    
    // payment 객체 기본값 강제 설정
    if (!recruitmentData.payment || typeof recruitmentData.payment !== 'object') {
      recruitmentData.payment = {};
    }
    if (!recruitmentData.payment.type) {
      recruitmentData.payment.type = '협의'; // ActorRecruitment 스키마의 enum 값
    }
    if (recruitmentData.payment.amount) {
      recruitmentData.payment.amount = parseInt(recruitmentData.payment.amount);
    }

    if (req.body.contactInfo && typeof req.body.contactInfo === 'string') {
      try {
        recruitmentData.contactInfo = JSON.parse(req.body.contactInfo);
      } catch (e) {
        console.log('contactInfo 파싱 실패, 기본 이메일 설정');
        recruitmentData.contactInfo = { email: 'contact@example.com' };
      }
    }
    
    // contactInfo 기본값 설정 
    if (!recruitmentData.contactInfo || Object.keys(recruitmentData.contactInfo).length === 0) {
      recruitmentData.contactInfo = { email: 'contact@example.com' };
    }

    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        recruitmentData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.log('tags 파싱 실패, 빈 배열로 설정');
        recruitmentData.tags = [];
      }
    } else if (Array.isArray(req.body.tags)) {
      recruitmentData.tags = req.body.tags;
    }

    // experience 기본값 설정
    if (!recruitmentData.experience) {
      recruitmentData.experience = '무관';
    }

    console.log('🔄 최종 모집공고 데이터:', JSON.stringify(recruitmentData, null, 2));

    // 스키마 검증 전 필수 필드 체크
    const requiredFields = ['title', 'content', 'category', 'projectType', 'location', 'applicationMethod', 'applicationDeadline'];
    const missingFields = requiredFields.filter(field => !recruitmentData[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ 필수 필드 누락:', missingFields);
      return res.status(400).json({
        success: false,
        message: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    const recruitment = new ActorRecruitment(recruitmentData);
    
    // save 전에 validation 체크
    const validationError = recruitment.validateSync();
    if (validationError) {
      console.error('❌ Mongoose 유효성 검사 실패:', validationError);
      const validationErrors = Object.values(validationError.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return res.status(400).json({
        success: false,
        message: '유효성 검사 실패',
        errors: validationErrors,
        data: recruitmentData
      });
    }

    await recruitment.save();

    const populatedRecruitment = await ActorRecruitment.findById(recruitment._id)
      .populate('userId', 'email');

    console.log('✅ 배우 모집공고 생성 성공:', populatedRecruitment._id);

    res.status(201).json({
      success: true,
      data: populatedRecruitment,
      message: '모집공고가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('❌ 배우 모집공고 생성 오류:', {
      message: error.message,
      name: error.name,
      errors: error.errors,
      stack: error.stack.split('\n').slice(0, 5).join('\n') // 스택 트레이스 줄임
    });
    
    // Mongoose validation 에러 처리
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return res.status(400).json({ 
        success: false, 
        message: '유효성 검사 실패',
        errors: validationErrors,
        fullError: error.message
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: error.message || '모집공고 생성에 실패했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 모집공고 수정
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const recruitment = await ActorRecruitment.findById(req.params.id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '모집공고를 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (recruitment.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '수정 권한이 없습니다.'
      });
    }

    const updateData = { ...req.body };

    // 새 이미지 처리
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/recruitments/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
      
      updateData.images = [...(recruitment.images || []), ...newImages].slice(0, 5);
    }

    // JSON 문자열 파싱
    if (req.body.roles) {
      updateData.roles = JSON.parse(req.body.roles);
    }
    if (req.body.shootingPeriod) {
      updateData.shootingPeriod = JSON.parse(req.body.shootingPeriod);
    }
    if (req.body.payment) {
      updateData.payment = JSON.parse(req.body.payment);
    }
    if (req.body.contactInfo) {
      updateData.contactInfo = JSON.parse(req.body.contactInfo);
    }
    if (req.body.tags) {
      updateData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }

    const updatedRecruitment = await ActorRecruitment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'email');

    res.json({
      success: true,
      data: updatedRecruitment,
      message: '모집공고가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('모집공고 수정 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '모집공고 수정에 실패했습니다.' 
    });
  }
});

// 모집공고 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const recruitment = await ActorRecruitment.findById(req.params.id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '모집공고를 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (recruitment.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '삭제 권한이 없습니다.'
      });
    }

    await ActorRecruitment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '모집공고가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('모집공고 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 모집공고 조회
router.get('/my/recruitments', auth, async (req, res) => {
  try {
    const recruitments = await ActorRecruitment.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: recruitments
    });
  } catch (error) {
    console.error('내 모집공고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 급구 모집공고 조회
router.get('/urgent/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recruitments = await ActorRecruitment.find({ 
      isUrgent: true, 
      status: '모집중',
      applicationDeadline: { $gte: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'email')
      .lean();

    res.json({
      success: true,
      data: recruitments
    });
  } catch (error) {
    console.error('급구 모집공고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 