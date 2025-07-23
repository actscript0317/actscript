const express = require('express');
const router = express.Router();
const ModelRecruitment = require('../models/ModelRecruitment');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/recruitments/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'model-' + uniqueSuffix + path.extname(file.originalname));
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
      status = '모집중',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 필터 조건 구성
    const filter = {};
    
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
    const recruitmentData = {
      ...req.body,
      userId: req.user.id
    };

    // 이미지 처리
    if (req.files && req.files.length > 0) {
      recruitmentData.images = req.files.map(file => ({
        url: `/uploads/recruitments/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
    }

    // JSON 문자열 파싱
    if (req.body.requirements) {
      recruitmentData.requirements = JSON.parse(req.body.requirements);
    }
    if (req.body.workPeriod) {
      recruitmentData.workPeriod = JSON.parse(req.body.workPeriod);
    }
    if (req.body.payment) {
      recruitmentData.payment = JSON.parse(req.body.payment);
    }
    if (req.body.contactInfo) {
      recruitmentData.contactInfo = JSON.parse(req.body.contactInfo);
    }
    if (req.body.portfolioRequirements) {
      recruitmentData.portfolioRequirements = JSON.parse(req.body.portfolioRequirements);
    }
    if (req.body.tags) {
      recruitmentData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }

    const recruitment = new ModelRecruitment(recruitmentData);
    await recruitment.save();

    const populatedRecruitment = await ModelRecruitment.findById(recruitment._id)
      .populate('userId', 'email');

    res.status(201).json({
      success: true,
      data: populatedRecruitment,
      message: '모델 모집공고가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('모델 모집공고 생성 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '모집공고 생성에 실패했습니다.' 
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