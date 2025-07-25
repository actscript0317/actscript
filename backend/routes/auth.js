const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const TempUser = require('../models/TempUser');
const { protect } = require('../middleware/auth');
const config = require('../config/env');
const sendEmail = require('../utils/sendEmail');
const mongoose = require('mongoose');

const router = express.Router();

// Google OAuth 클라이언트 설정
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Client ID 확인
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('⚠️ GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다. Google 로그인이 비활성화됩니다.');
}

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

// 3단계 회원가입 완료 (이메일 인증 후)
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 형식을 입력해주세요.'),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('인증 코드는 6자리여야 합니다.'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('사용자명은 3-20자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.')
    .custom((value) => {
      // 비밀번호 복잡성 검증: 영문 대소문자, 숫자, 특수문자 중 3종류 이상
      const hasLowercase = /[a-z]/.test(value);
      const hasUppercase = /[A-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      
      const criteriaCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
      
      if (criteriaCount < 3) {
        throw new Error('비밀번호는 영문 대소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
      }
      
      return true;
    }),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('이름은 1-50자 사이여야 합니다.')
], async (req, res) => {
  try {
    debug('3단계 회원가입 완료 요청 시작');

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug('유효성 검사 실패', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, verificationCode, username, password, name } = req.body;
    debug('회원가입 완료 요청', { email, username, name });

    // 임시 사용자 찾기 및 인증 코드 검증
    const tempUser = await TempUser.findOne({ email: email.toLowerCase() });

    if (!tempUser) {
      debug('임시 사용자를 찾을 수 없음', { email });
      return res.status(400).json({
        success: false,
        message: '인증 코드가 만료되었거나 유효하지 않습니다.'
      });
    }

    // 인증 코드 검증
    if (!tempUser.verifyEmailCode(verificationCode)) {
      debug('인증 코드 검증 실패', { email });
      return res.status(400).json({
        success: false,
        message: '인증 코드가 올바르지 않거나 만료되었습니다.'
      });
    }

    // 사용자명 중복 확인
    const existingUsername = await User.findOne({ 
      username: username.toLowerCase(),
      isEmailVerified: true 
    });
    if (existingUsername) {
      debug('사용자명 중복', { username });
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.'
      });
    }

    // 새 사용자 생성
    const newUser = new User({
      email: email.toLowerCase(),
      username: username.toLowerCase(), 
      password,
      name,
      isEmailVerified: true,
      isActive: true,
      role: 'user'
    });

    const savedUser = await newUser.save();
    debug('새 사용자 생성 완료', { userId: savedUser._id });

    // 임시 사용자 정보 삭제
    await TempUser.deleteOne({ email: email.toLowerCase() });
    debug('임시 사용자 정보 삭제 완료');

    // JWT 토큰 생성
    const token = savedUser.getSignedJwtToken();

    debug('3단계 회원가입 완료', { userId: savedUser._id });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      token,
      user: savedUser.toSafeObject()
    });

  } catch (error) {
    debug('3단계 회원가입 완료 실패', { 
      error: error.message,
      stack: error.stack 
    });
    console.error('회원가입 완료 에러:', error);
    
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.'
    });
  }
});

// 로그인
router.post('/login', [
  body('email')
    .notEmpty()
    .withMessage('이메일을 입력해주세요.')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.'),
  body('password')
    .notEmpty()
    .withMessage('비밀번호를 입력해주세요.')
], async (req, res) => {
  try {
    debug('로그인 요청', { 
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

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

    const { email, password } = req.body;

    // 사용자 찾기
    debug('사용자 조회 중');
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      debug('사용자를 찾을 수 없음', { email });
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 계정 잠금 확인
    if (user.isLocked) {
      debug('잠긴 계정', { userId: user._id, lockUntil: user.lockUntil });
      return res.status(423).json({
        success: false,
        message: '너무 많은 로그인 시도로 계정이 일시적으로 잠겼습니다. 15분 후 다시 시도해주세요.'
      });
    }

    // 계정 활성화 확인
    if (!user.isActive) {
      debug('비활성화된 계정', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: '비활성화된 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 비밀번호 확인
    debug('비밀번호 확인 중');
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      debug('비밀번호 불일치', { userId: user._id });
      
      // 로그인 실패 시도 증가
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 로그인 성공 시 시도 횟수 초기화 및 마지막 로그인 시간 업데이트
    await user.resetLoginAttempts();

    // JWT 토큰 생성
    debug('JWT 토큰 생성 중');
    const token = user.getSignedJwtToken();

    debug('로그인 성공', { userId: user._id });

    res.status(200)
      .cookie('token', token, getCookieOptions())
      .json({
        success: true,
        message: '로그인이 완료되었습니다.',
        token,
        user: user.toSafeObject()
      });

  } catch (error) {
    debug('로그인 처리 중 에러', { 
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: config.NODE_ENV === 'development' ? error.message : '서버 오류가 발생했습니다.'
    });
  }
});

// Google 로그인
router.post('/google', [
  body('credential')
    .notEmpty()
    .withMessage('Google credential이 필요합니다.')
], async (req, res) => {
  try {
    debug('Google 로그인 시도', { ip: req.ip });

    // Google Client ID 설정 확인
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        message: 'Google 로그인이 현재 사용할 수 없습니다.'
      });
    }

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청입니다.',
        errors: errors.array()
      });
    }

    const { credential } = req.body; // Google Sign-In에서는 credential을 사용

    // Google 토큰 검증
    debug('Google 토큰 검증 중');
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    debug('Google 토큰 검증 완료', {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name
    });

    const { sub: googleId, email, name, picture } = payload;

    // 기존 사용자 확인 (Google ID 또는 이메일로)
    let user = await User.findOne({
      $or: [
        { googleId },
        { email }
      ]
    });

    if (user) {
      // 기존 사용자 - Google ID 업데이트 (이메일로만 가입한 경우)
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
        await user.save({ validateBeforeSave: false });
        debug('기존 사용자에 Google ID 연결', { userId: user._id });
      }
      
      // 로그인 성공 처리
      await user.resetLoginAttempts();
    } else {
      // 새 사용자 생성
      debug('새 Google 사용자 생성 중');
      
      // 중복되지 않는 사용자명 생성
      let username = email.split('@')[0];
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}_${Date.now()}`;
      }

      user = await User.create({
        googleId,
        email,
        name,
        username,
        provider: 'google',
        isActive: true
      });

      debug('새 Google 사용자 생성 완료', { userId: user._id });
    }

    // JWT 토큰 생성
    const jwtToken = user.getSignedJwtToken();

    debug('Google 로그인 성공', { userId: user._id });

    res.status(200)
      .cookie('token', jwtToken, getCookieOptions())
      .json({
        success: true,
        message: 'Google 로그인이 완료되었습니다.',
        token: jwtToken,
        user: user.toSafeObject(),
        isNewUser: !user.lastLogin // 새 사용자인지 여부
      });

  } catch (error) {
    debug('Google 로그인 에러', { 
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Google 로그인 중 오류가 발생했습니다.',
      error: config.NODE_ENV === 'development' ? error.message : '서버 오류가 발생했습니다.'
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
    .isLength({ min: 8 })
    .withMessage('새 비밀번호는 최소 8자 이상이어야 합니다.')
    .custom((value) => {
      // 비밀번호 복잡성 검증: 영문 대소문자, 숫자, 특수문자 중 3종류 이상
      const hasLowercase = /[a-z]/.test(value);
      const hasUppercase = /[A-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      
      const criteriaCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
      
      if (criteriaCount < 3) {
        throw new Error('비밀번호는 영문 대소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
      }
      
      return true;
    })
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

// 비밀번호 재설정 요청
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일을 입력해주세요.')
], async (req, res) => {
  try {
    debug('비밀번호 재설정 요청', { email: req.body.email });

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일을 입력해주세요.',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      // 보안상 이유로 사용자가 없어도 성공 메시지 반환
      return res.status(200).json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.'
      });
    }

    // Google 로그인 사용자는 비밀번호 재설정 불가
    if (user.provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Google 계정은 Google에서 비밀번호를 관리해주세요.'
      });
    }

    // 재설정 토큰 생성
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    debug('비밀번호 재설정 토큰 생성', { userId: user._id });

    // 재설정 URL 생성
    const resetUrl = `${config.CLIENT_URL}/reset-password/${resetToken}`;

    // 이메일 HTML 템플릿
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">ActScript</h1>
          <h2 style="color: #374151;">비밀번호 재설정</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; color: #374151;">안녕하세요, ${user.name}님!</p>
          <p style="margin: 0 0 15px 0; color: #374151;">비밀번호 재설정 요청을 받았습니다.</p>
          <p style="margin: 0 0 15px 0; color: #374151;">아래 버튼을 클릭하여 새 비밀번호를 설정해주세요:</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            비밀번호 재설정하기
          </a>
        </div>
        
        <div style="background: #fef3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⚠️ 이 링크는 10분 후에 만료됩니다.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시해주세요.
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            링크가 작동하지 않는 경우 다음 URL을 브라우저에 복사해주세요:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'ActScript 비밀번호 재설정',
        html
      });

      debug('비밀번호 재설정 이메일 전송 완료', { userId: user._id });

      res.status(200).json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.'
      });
    } catch (error) {
      debug('이메일 전송 실패', { error: error.message });
      
      // 이메일 전송 실패 시 토큰 정리
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: '이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

  } catch (error) {
    debug('비밀번호 재설정 요청 에러', { error: error.message });
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: config.NODE_ENV === 'development' ? error.message : '서버 오류가 발생했습니다.'
    });
  }
});

// 비밀번호 재설정 실행
router.put('/reset-password/:resettoken', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('비밀번호 확인이 일치하지 않습니다.');
      }
      return true;
    })
], async (req, res) => {
  try {
    debug('비밀번호 재설정 실행', { token: req.params.resettoken });

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    // 토큰 해싱
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // 토큰으로 사용자 찾기 (만료 시간도 확인)
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      debug('유효하지 않거나 만료된 토큰', { token: req.params.resettoken });
      return res.status(400).json({
        success: false,
        message: '유효하지 않거나 만료된 토큰입니다.'
      });
    }

    debug('비밀번호 재설정 중', { userId: user._id });

    // 새 비밀번호 설정
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    debug('비밀번호 재설정 완료', { userId: user._id });

    res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다.'
    });

  } catch (error) {
    debug('비밀번호 재설정 에러', { error: error.message });
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: config.NODE_ENV === 'development' ? error.message : '서버 오류가 발생했습니다.'
    });
  }
});

// 이메일 인증 요청 (회원가입 후)
router.post('/send-verification', protect, async (req, res) => {
  try {
    debug('이메일 인증 요청 시작', { userId: req.user.id });

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: '이미 인증된 이메일입니다.'
      });
    }

    // 이메일 인증 토큰 생성
    const emailVerificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // 인증 이메일 전송
    const verificationUrl = `${config.CLIENT_URL}/verify-email/${emailVerificationToken}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">ActScript</h1>
          <h2 style="color: #374151;">이메일 인증</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; color: #374151;">안녕하세요, ${user.name}님!</p>
          <p style="margin: 0 0 15px 0; color: #374151;">ActScript 회원가입을 완료하기 위해 이메일 인증이 필요합니다.</p>
          <p style="margin: 0 0 15px 0; color: #374151;">아래 버튼을 클릭하여 이메일을 인증해주세요:</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            이메일 인증하기
          </a>
        </div>
        
        <div style="background: #fef3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⚠️ 이 링크는 10분 후에 만료됩니다.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            만약 이 요청을 하지 않으셨다면, 이 이메일을 무시해주세요.
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            링크가 작동하지 않는 경우 다음 URL을 브라우저에 복사해주세요:<br>
            <span style="word-break: break-all;">${verificationUrl}</span>
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'ActScript 이메일 인증',
      html
    });

    debug('이메일 인증 요청 성공', { email: user.email });

    res.status(200).json({
      success: true,
      message: '인증 이메일이 전송되었습니다.'
    });

  } catch (error) {
    console.error('이메일 인증 요청 에러:', error);
    
    // 토큰 초기화
    const user = await User.findById(req.user.id);
    if (user) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }

    res.status(500).json({
      success: false,
      message: '이메일 전송 중 오류가 발생했습니다.'
    });
  }
});

// 이메일 인증 확인
router.get('/verify-email/:token', async (req, res) => {
  try {
    debug('이메일 인증 확인 시작', { token: req.params.token.substring(0, 10) + '...' });

    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 토큰이거나 만료된 토큰입니다.'
      });
    }

    // 이메일 인증 완료
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save({ validateBeforeSave: false });

    debug('이메일 인증 성공', { userId: user._id, email: user.email });

    res.status(200).json({
      success: true,
      message: '이메일 인증이 완료되었습니다.'
    });

  } catch (error) {
    console.error('이메일 인증 확인 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 이메일 인증 상태 확인
router.get('/verification-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isEmailVerified email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        isEmailVerified: user.isEmailVerified,
        email: user.email
      }
    });

  } catch (error) {
    console.error('이메일 인증 상태 확인 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 회원가입용 이메일 인증 코드 요청
router.post('/request-verification-code', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 형식을 입력해주세요.')
], async (req, res) => {
  try {
    debug('이메일 인증 코드 요청 시작');

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug('유효성 검사 실패', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email } = req.body;
    debug('이메일 인증 코드 요청', { email });

    // 기존 사용자 확인
    const existingUser = await User.findOne({ email, isEmailVerified: true });
    if (existingUser) {
      debug('이미 인증된 이메일', { email });
      return res.status(400).json({
        success: false,
        message: '이미 사용중인 이메일입니다.'
      });
    }

    // 임시 사용자 찾기 또는 생성
    let tempUser = await TempUser.findOne({ email });
    
    if (!tempUser) {
      debug('새 임시 사용자 생성', { email });
      tempUser = new TempUser({ email });
    }

    // 인증 코드 생성
    const verificationCode = tempUser.generateEmailVerificationCode();
    debug('인증 코드 생성 완료');
    
    // 개발 환경에서 콘솔에 인증 코드 출력
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 [개발용] 인증 코드: ${verificationCode} (${email})`);
    }

    // 사용자 저장
    await tempUser.save();
    debug('임시 사용자 저장 완료');

    // 이메일 발송
    const emailHtml = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">ActScript</h1>
          <p style="color: #666; margin: 5px 0;">연기 대본 라이브러리</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">이메일 인증 코드</h2>
          <p style="color: #666; margin-bottom: 30px;">
            회원가입을 완료하기 위해 아래 인증 코드를 입력해주세요.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; font-family: 'Courier New', monospace;">
              ${verificationCode}
            </div>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            이 코드는 10분 후에 만료됩니다.<br>
            만약 회원가입을 요청하지 않으셨다면, 이 이메일을 무시하세요.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            © 2024 ActScript. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email,
        subject: '[ActScript] 회원가입 인증 코드',
        html: emailHtml
      });
      debug('인증 코드 이메일 발송 완료', { email });
    } catch (emailError) {
      debug('이메일 발송 실패, 하지만 인증 코드는 생성됨', { 
        email, 
        error: emailError.message 
      });
      console.log('📧 이메일 발송 실패했지만 인증 코드는 유효합니다:', verificationCode);
    }

    res.status(200).json({
      success: true,
      message: '인증 코드가 이메일로 전송되었습니다.',
      data: {
        email,
        expiresIn: '10분'
      }
    });

  } catch (error) {
    debug('이메일 인증 코드 요청 실패', { 
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error('인증 코드 요청 상세 에러:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      mongooseConnectionState: mongoose.connection.readyState
    });
    
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      ...(process.env.NODE_ENV !== 'production' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
});

module.exports = router; 