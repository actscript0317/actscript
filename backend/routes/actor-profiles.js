const express = require('express');
const router = express.Router();
const ActorProfile = require('../models/ActorProfile');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
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

// 모든 프로필 조회 (필터링, 검색, 정렬 지원)
router.get('/', async (req, res) => {
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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 필터 조건 구성
    const filter = { isActive: true };
    
    if (gender && gender !== 'all') filter.gender = gender;
    if (experience && experience !== 'all') filter.experience = experience;
    if (location && location !== 'all') filter.location = location;
    if (specialty && specialty !== 'all') filter.specialty = { $in: [specialty] };
    
    if (ageMin || ageMax) {
      filter.age = {};
      if (ageMin) filter.age.$gte = parseInt(ageMin);
      if (ageMax) filter.age.$lte = parseInt(ageMax);
    }

    // 검색 조건
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // 정렬 조건
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const profiles = await ActorProfile.find(filter)
      .populate('userId', 'email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await ActorProfile.countDocuments(filter);

    res.json({
      success: true,
      data: profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 프로필 조회
router.get('/:id', async (req, res) => {
  try {
    const profile = await ActorProfile.findById(req.params.id)
      .populate('userId', 'email')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '프로필을 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await ActorProfile.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('프로필 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 프로필 생성
router.post('/', auth, upload.array('images', 7), async (req, res) => {
  try {
    const profileData = {
      ...req.body,
      userId: req.user.id
    };

    // 이미지 처리
    if (req.files && req.files.length > 0) {
      profileData.images = req.files.map(file => ({
        url: `/uploads/profiles/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
    }

    // specialty 배열 처리
    if (req.body.specialty) {
      profileData.specialty = Array.isArray(req.body.specialty) 
        ? req.body.specialty 
        : [req.body.specialty];
    }

    const profile = new ActorProfile(profileData);
    await profile.save();

    const populatedProfile = await ActorProfile.findById(profile._id)
      .populate('userId', 'email');

    res.status(201).json({
      success: true,
      data: populatedProfile,
      message: '프로필이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('프로필 생성 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '프로필 생성에 실패했습니다.' 
    });
  }
});

// 프로필 수정
router.put('/:id', auth, upload.array('images', 7), async (req, res) => {
  try {
    const profile = await ActorProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '프로필을 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (profile.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '수정 권한이 없습니다.'
      });
    }

    const updateData = { ...req.body };

    // 새 이미지 처리
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/profiles/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
      
      // 기존 이미지와 합치기 (최대 7개)
      updateData.images = [...(profile.images || []), ...newImages].slice(0, 7);
    }

    // specialty 배열 처리
    if (req.body.specialty) {
      updateData.specialty = Array.isArray(req.body.specialty) 
        ? req.body.specialty 
        : [req.body.specialty];
    }

    const updatedProfile = await ActorProfile.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'email');

    res.json({
      success: true,
      data: updatedProfile,
      message: '프로필이 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('프로필 수정 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '프로필 수정에 실패했습니다.' 
    });
  }
});

// 프로필 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const profile = await ActorProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '프로필을 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (profile.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '삭제 권한이 없습니다.'
      });
    }

    await ActorProfile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '프로필이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('프로필 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 프로필 조회
router.get('/my/profiles', auth, async (req, res) => {
  try {
    const profiles = await ActorProfile.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('내 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 인기 프로필 조회
router.get('/popular/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const profiles = await ActorProfile.find({ isActive: true })
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'email')
      .lean();

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('인기 프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 