const express = require('express');
const router = express.Router();
const ModelRecruitment = require('../models/ModelRecruitment');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const fs = require('fs');

// uploads 디렉토리 생성 (절대 경로 사용)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'recruitments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 [model-recruitments] uploads/recruitments 디렉토리 생성됨:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // 파일 정보 상세 로깅
    console.log('📷 [model-recruitments] multer 파일 정보:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // 확장자 추출
    let ext = path.extname(file.originalname);
    
    // 확장자가 없는 경우 mimetype으로 추정
    if (!ext) {
      console.log('⚠️ [model-recruitments] 확장자 없음, mimetype으로 추정:', file.mimetype);
      if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) {
        ext = '.jpg';
      } else if (file.mimetype.includes('png')) {
        ext = '.png';
      } else if (file.mimetype.includes('webp')) {
        ext = '.webp';
      } else if (file.mimetype.includes('gif')) {
        ext = '.gif';
      } else {
        ext = '.jpg'; // 기본값
      }
      console.log('✅ [model-recruitments] 추정된 확장자:', ext);
    }
    
    const filename = 'model-' + uniqueSuffix + ext;
    console.log('📁 [model-recruitments] 최종 파일명:', filename);
    
    cb(null, filename);
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

// 모든 모델 모집공고 조회
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      modelType,
      location,
      gender,
      paymentType,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 모델 모집 조회 요청:', { page, limit, category, modelType, location, gender, paymentType, status, search });

    // 필터 조건 구성
    const filter = {};
    
    // status가 명시적으로 전달된 경우에만 필터링
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (modelType && modelType !== 'all') filter.modelType = modelType;
    if (location && location !== 'all') filter.location = location;
    if (gender && gender !== 'all') filter['requirements.gender'] = gender;
    if (paymentType && paymentType !== 'all') filter['payment.type'] = paymentType;

    // 검색 조건
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    console.log('📊 실제 필터 조건:', filter);

    // 정렬 조건
    const sort = {};
    if (sortBy === 'deadline') {
      sort.applicationDeadline = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'urgent') {
      sort.isUrgent = -1;
      sort.createdAt = -1;
    } else if (sortBy === 'payment') {
      sort['payment.amount'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const recruitments = await ModelRecruitment.find(filter)
      .populate('userId', 'email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await ModelRecruitment.countDocuments(filter);

    console.log('📥 모델 모집 조회 결과:', { count: recruitments.length, total });

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
    console.error('모델 모집공고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 모델 모집공고 조회
router.get('/:id', async (req, res) => {
  try {
    const recruitment = await ModelRecruitment.findById(req.params.id)
      .populate('userId', 'email')
      .lean();

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '모집공고를 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await ModelRecruitment.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: recruitment
    });
  } catch (error) {
    console.error('모델 모집공고 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모델 모집공고 생성
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('📥 모델 모집공고 생성 요청:', {
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

    // 기본값 설정
    if (!recruitmentData.modelType) {
      recruitmentData.modelType = '패션모델';
    }
    if (!recruitmentData.location) {
      recruitmentData.location = '서울';
    }
    if (!recruitmentData.applicationMethod) {
      recruitmentData.applicationMethod = '이메일';
    }
    if (!recruitmentData.category) {
      recruitmentData.category = '화보촬영'; // ModelRecruitment 스키마의 enum 첫 번째 값
    }

    // 지원 마감일 기본값 설정 (30일 후)
    if (!recruitmentData.applicationDeadline) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      recruitmentData.applicationDeadline = futureDate.toISOString();
    } else if (typeof recruitmentData.applicationDeadline === 'string') {
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
    if (req.body.requirements && typeof req.body.requirements === 'string') {
      try {
        recruitmentData.requirements = JSON.parse(req.body.requirements);
      } catch (e) {
        console.log('requirements 파싱 실패, 기본값 설정');
        recruitmentData.requirements = {};
      }
    }
    
    // requirements 기본값 설정
    if (!recruitmentData.requirements) {
      recruitmentData.requirements = {};
    }
    if (!recruitmentData.requirements.gender) {
      recruitmentData.requirements.gender = '무관';
    }
    if (!recruitmentData.requirements.experience) {
      recruitmentData.requirements.experience = '무관';
    }

    if (req.body.workPeriod && typeof req.body.workPeriod === 'string') {
      try {
        recruitmentData.workPeriod = JSON.parse(req.body.workPeriod);
      } catch (e) {
        console.log('workPeriod 파싱 실패, 빈 객체로 설정');
        recruitmentData.workPeriod = {};
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
    
    // payment 기본값 설정
    if (!recruitmentData.payment) {
      recruitmentData.payment = {};
    }
    if (!recruitmentData.payment.type) {
      recruitmentData.payment.type = '협의';
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

    if (req.body.portfolioRequirements && typeof req.body.portfolioRequirements === 'string') {
      try {
        recruitmentData.portfolioRequirements = JSON.parse(req.body.portfolioRequirements);
      } catch (e) {
        console.log('portfolioRequirements 파싱 실패, 기본값 설정');
        recruitmentData.portfolioRequirements = { photos: true };
      }
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

    console.log('🔄 최종 모집공고 데이터:', JSON.stringify(recruitmentData, null, 2));

    // 스키마 검증 전 필수 필드 체크
    const requiredFields = ['title', 'content', 'category', 'modelType', 'location', 'applicationMethod', 'applicationDeadline'];
    const missingFields = requiredFields.filter(field => !recruitmentData[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ 필수 필드 누락:', missingFields);
      return res.status(400).json({
        success: false,
        message: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
        missingFields,
        data: recruitmentData
      });
    }

    const recruitment = new ModelRecruitment(recruitmentData);

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

    const populatedRecruitment = await ModelRecruitment.findById(recruitment._id)
      .populate('userId', 'email');

    console.log('✅ 모델 모집공고 생성 성공:', populatedRecruitment._id);

    res.status(201).json({
      success: true,
      data: populatedRecruitment,
      message: '모델 모집공고가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('❌ 모델 모집공고 생성 오류:', {
      message: error.message,
      name: error.name,
      errors: error.errors,
      stack: error.stack.split('\n').slice(0, 5).join('\n')
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
    const recruitment = await ModelRecruitment.findById(req.params.id);

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
    if (req.body.requirements) {
      updateData.requirements = JSON.parse(req.body.requirements);
    }
    if (req.body.workPeriod) {
      updateData.workPeriod = JSON.parse(req.body.workPeriod);
    }
    if (req.body.payment) {
      updateData.payment = JSON.parse(req.body.payment);
    }
    if (req.body.contactInfo) {
      updateData.contactInfo = JSON.parse(req.body.contactInfo);
    }
    if (req.body.portfolioRequirements) {
      updateData.portfolioRequirements = JSON.parse(req.body.portfolioRequirements);
    }
    if (req.body.tags) {
      updateData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }

    const updatedRecruitment = await ModelRecruitment.findByIdAndUpdate(
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
    console.error('모델 모집공고 수정 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '모집공고 수정에 실패했습니다.' 
    });
  }
});

// 모집공고 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const recruitment = await ModelRecruitment.findById(req.params.id);

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

    await ModelRecruitment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '모집공고가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('모델 모집공고 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 모집공고 조회
router.get('/my/recruitments', auth, async (req, res) => {
  try {
    const recruitments = await ModelRecruitment.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: recruitments
    });
  } catch (error) {
    console.error('내 모델 모집공고 조회 오류:', error);
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

    const recruitments = await ModelRecruitment.find({ 
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
    console.error('급구 모델 모집공고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 