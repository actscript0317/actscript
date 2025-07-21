const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const config = require('../config/env');

const router = express.Router();

// 쿠키 옵션
const getCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax'
});

// 회원가입
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('사용자명은 3-20자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 형식을 입력해주세요.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('비밀번호는 최소 6자 이상이어야 합니다.'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('이름은 1-50자 사이여야 합니다.')
], async (req, res) => {
  try {
    console.log('📝 회원가입 요청 시작');
    console.log('요청 데이터:', { 
      ...req.body, 
      password: '[HIDDEN]',
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 유효성 검사 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터에 오류가 있습니다.',
        errors: errors.array()
      });
    }

    const { username, email, password, name } = req.body;

    // 중복 확인
    console.log('🔍 사용자 중복 확인 중...');
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      console.log('❌ 중복된 사용자 발견:', {
        existingUsername: existingUser.username === username.toLowerCase(),
        existingEmail: existingUser.email === email.toLowerCase()
      });
      return res.status(400).json({
        success: false,
        message: existingUser.username === username.toLowerCase()
          ? '이미 사용 중인 사용자명입니다.'
          : '이미 사용 중인 이메일입니다.'
      });
    }

    // 사용자 생성
    console.log('👤 새 사용자 생성 중...');
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      name,
      isActive: true,
      role: 'user'
    });

    // mongoose 유효성 검사
    console.log('✔️ mongoose 모델 유효성 검사 중...');
    const validationError = user.validateSync();
    if (validationError) {
      console.error('❌ mongoose 유효성 검사 실패:', validationError);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: Object.values(validationError.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    // 사용자 저장
    console.log('💾 사용자 데이터 저장 중...');
    const savedUser = await user.save();
    console.log('✅ 사용자 저장 완료:', savedUser._id);

    // JWT 토큰 생성
    console.log('🔑 JWT 토큰 생성 중...');
    const token = savedUser.getSignedJwtToken();
    console.log('✅ JWT 토큰 생성 완료');

    // 응답 전송
    console.log('📤 회원가입 완료 응답 전송');
    res.status(201)
      .cookie('token', token, getCookieOptions())
      .json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        token,
        user: savedUser.toSafeObject()
      });

  } catch (error) {
    console.error('❌ 회원가입 처리 중 에러:', error);
    
    // mongoose 유효성 검사 에러
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    // MongoDB 중복 키 에러
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `이미 사용 중인 ${field === 'username' ? '사용자명' : '이메일'}입니다.`
      });
    }

    // 기타 에러
    console.error('❌ 상세 에러 정보:', {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
      error: config.NODE_ENV === 'development' ? error.message : '서버 오류가 발생했습니다.'
    });
  }
});

// 로그인
router.post('/login', [
  body('loginId')
    .notEmpty()
    .withMessage('사용자명 또는 이메일을 입력해주세요.'),
  body('password')
    .notEmpty()
    .withMessage('비밀번호를 입력해주세요.')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터에 오류가 있습니다.',
        errors: errors.array()
      });
    }

    const { loginId, password } = req.body;

    // 사용자 찾기 (사용자명 또는 이메일로)
    const user = await User.findOne({
      $or: [
        { username: loginId },
        { email: loginId }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 계정 활성화 확인
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '비활성화된 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 비밀번호 확인
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 마지막 로그인 시간 업데이트
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // JWT 토큰 생성
    const token = user.getSignedJwtToken();

    res.status(200)
      .cookie('token', token, getCookieOptions())
      .json({
        success: true,
        message: '로그인이 완료되었습니다.',
        token,
        user: user.toSafeObject()
      });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 로그아웃
router.post('/logout', (req, res) => {
  res.status(200)
    .cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    })
    .json({
      success: true,
      message: '로그아웃이 완료되었습니다.'
    });
});

// 현재 사용자 정보 조회
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 프로필 수정
router.put('/profile', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('이름은 1-50자 사이여야 합니다.'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 형식을 입력해주세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터에 오류가 있습니다.',
        errors: errors.array()
      });
    }

    const { name, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // 이메일 중복 확인
      const existingUser = await User.findOne({ 
        email: email, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '이미 사용 중인 이메일입니다.'
        });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '프로필이 성공적으로 수정되었습니다.',
      user: user.toSafeObject()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '프로필 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 비밀번호 변경
router.put('/password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터에 오류가 있습니다.',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // 현재 비밀번호로 사용자 조회
    const user = await User.findById(req.user.id).select('+password');

    // 현재 비밀번호 확인
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 새 비밀번호 설정
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router; 