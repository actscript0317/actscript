const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const config = require('../config/env');
const mongoose = require('mongoose');

const router = express.Router();

// 디버그 로그 유틸리티
const debug = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔐 Auth Route - ${message}`, {
    ...data,
    password: data.password ? '[HIDDEN]' : undefined
  });
};

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    debug('회원가입 요청 시작', { 
      body: { ...req.body, password: '[HIDDEN]' },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // MongoDB 연결 상태 확인
    if (mongoose.connection.readyState !== 1) {
      throw new Error('데이터베이스 연결이 활성화되지 않았습니다.');
    }
    
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug('유효성 검사 실패', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: '입력 데이터에 오류가 있습니다.',
        errors: errors.array()
      });
    }

    const { username, email, password, name } = req.body;

    // 중복 확인
    debug('사용자 중복 확인');
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    }).session(session);

    if (existingUser) {
      debug('중복된 사용자 발견', {
        existingUsername: existingUser.username === username.toLowerCase(),
        existingEmail: existingUser.email === email.toLowerCase()
      });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: existingUser.username === username.toLowerCase()
          ? '이미 사용 중인 사용자명입니다.'
          : '이미 사용 중인 이메일입니다.'
      });
    }

    // 사용자 생성
    debug('새 사용자 생성');
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      name,
      isActive: true,
      role: 'user'
    });

    // mongoose 유효성 검사
    debug('mongoose 모델 유효성 검사');
    const validationError = user.validateSync();
    if (validationError) {
      debug('mongoose 유효성 검사 실패', {
        errors: Object.values(validationError.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
      await session.abortTransaction();
      session.endSession();
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
    debug('사용자 데이터 저장');
    const savedUser = await user.save({ session });
    debug('사용자 저장 완료', { userId: savedUser._id });

    // JWT 토큰 생성
    debug('JWT 토큰 생성');
    const token = savedUser.getSignedJwtToken();

    // 트랜잭션 커밋
    await session.commitTransaction();
    session.endSession();

    debug('회원가입 완료', { userId: savedUser._id });

    // 응답 전송
    res.status(201)
      .cookie('token', token, getCookieOptions())
      .json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        token,
        user: savedUser.toSafeObject()
      });

  } catch (error) {
    debug('회원가입 처리 중 에러', { 
      error: error.message,
      stack: error.stack
    });

    // 트랜잭션 롤백
    await session.abortTransaction();
    session.endSession();

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

    // 데이터베이스 연결 에러
    if (error.message.includes('데이터베이스 연결')) {
      return res.status(503).json({
        success: false,
        message: '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

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

// MongoDB 연결 상태 확인
router.get('/db-status', async (req, res) => {
  try {
    debug('데이터베이스 상태 확인 요청');
    
    const status = {
      mongooseState: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections)
    };
    
    // 연결 테스트
    if (status.connected) {
      try {
        // 간단한 쿼리로 실제 연결 테스트
        const testDoc = new mongoose.Types.ObjectId();
        await mongoose.connection.db.collection('users').findOne({ _id: testDoc });
        status.queryTest = 'success';
      } catch (queryError) {
        status.queryTest = 'failed';
        status.queryError = queryError.message;
      }
    }
    
    debug('데이터베이스 상태', status);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    debug('데이터베이스 상태 확인 실패', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 