const express = require('express');
const router = express.Router();
const ActorProfile = require('../models/ActorProfile');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const fs = require('fs');

// uploads 디렉토리 생성 (절대 경로 사용)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 [actor-profiles] uploads/profiles 디렉토리 생성됨:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // 파일 정보 상세 로깅
    console.log('📷 [actor-profiles] multer 파일 정보:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // 확장자 추출
    let ext = path.extname(file.originalname);
    
    // 확장자가 없는 경우 mimetype으로 추정
    if (!ext) {
      console.log('⚠️ [actor-profiles] 확장자 없음, mimetype으로 추정:', file.mimetype);
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
      console.log('✅ [actor-profiles] 추정된 확장자:', ext);
    }
    
    const filename = 'profile-' + uniqueSuffix + ext;
    console.log('📁 [actor-profiles] 최종 파일명:', filename);
    
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
    console.log('📥 프로필 생성 요청 데이터:', {
      body: req.body,
      filesCount: req.files?.length || 0,
      userId: req.user?.id
    });

    const profileData = {
      ...req.body,
      userId: req.user.id
    };

    // JSON 문자열 파싱
    if (req.body.contact && typeof req.body.contact === 'string') {
      try {
        profileData.contact = JSON.parse(req.body.contact);
      } catch (e) {
        console.log('contact 파싱 실패, 빈 객체로 설정');
        profileData.contact = {};
      }
    }

    if (req.body.specialty && typeof req.body.specialty === 'string') {
      try {
        profileData.specialty = JSON.parse(req.body.specialty);
      } catch (e) {
        console.log('specialty 파싱 실패, 빈 배열로 설정');
        profileData.specialty = [];
      }
    }

    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        profileData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.log('tags 파싱 실패, 빈 배열로 설정');
        profileData.tags = [];
      }
    }

    // 기본값 설정
    if (!profileData.name || profileData.name.trim() === '') {
      profileData.name = '이름 미입력';
    }
    if (!profileData.gender) {
      profileData.gender = '기타';
    }
    if (!profileData.experience) {
      profileData.experience = '신인';
    }
    if (!profileData.location) {
      profileData.location = '서울';
    }

    // 숫자 필드 변환
    if (profileData.age) profileData.age = parseInt(profileData.age);
    if (profileData.height) profileData.height = parseInt(profileData.height);
    if (profileData.weight) profileData.weight = parseInt(profileData.weight);

    // 이미지 처리
    if (req.files && req.files.length > 0) {
      console.log('📷 [actor-profiles] 이미지 파일 처리:', {
        count: req.files.length,
        files: req.files.map(f => ({ filename: f.filename, size: f.size, path: f.path }))
      });
      
      profileData.images = req.files.map(file => ({
        url: `/uploads/profiles/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
      
      console.log('✅ [actor-profiles] 이미지 URL 생성 완료:', profileData.images);
    } else {
      console.log('📷 [actor-profiles] 업로드된 이미지 없음');
    }

    console.log('🔄 최종 프로필 데이터:', profileData);

    const profile = new ActorProfile(profileData);
    await profile.save();

    const populatedProfile = await ActorProfile.findById(profile._id)
      .populate('userId', 'email');

    console.log('✅ 프로필 생성 성공:', populatedProfile._id);

    // 생성된 이미지 파일 실제 존재 여부 확인
    if (populatedProfile.images && populatedProfile.images.length > 0) {
      populatedProfile.images.forEach((image, index) => {
        const fullPath = path.join(__dirname, '..', 'uploads', 'profiles', image.filename);
        const exists = fs.existsSync(fullPath);
        console.log(`📷 [생성완료] 이미지 ${index + 1} 파일 존재 확인:`, {
          filename: image.filename,
          url: image.url,
          exists: exists,
          fullPath: exists ? fullPath : '파일 없음'
        });
      });
    }

    res.status(201).json({
      success: true,
      data: populatedProfile,
      message: '프로필이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('❌ 프로필 생성 오류:', {
      message: error.message,
      name: error.name,
      errors: error.errors,
      stack: error.stack
    });
    
    // Mongoose validation 에러 처리
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: '유효성 검사 실패: ' + validationErrors.join(', '),
        errors: validationErrors
      });
    }
    
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