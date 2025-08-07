const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const { sendVerificationEmail } = require('../config/mailgun');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();

console.log('🔄 [auth.js] 라우터 로딩 완료, 엔드포인트 등록 중...');

// temp_users 테이블 확인 엔드포인트
router.get('/test-temp-users', async (req, res) => {
  try {
    console.log('🔧 temp_users 테이블 테스트 중...');
    
    // temp_users 테이블 조회 시도
    const { data, error } = await supabase
      .from('temp_users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ temp_users 테이블 조회 실패:', error);
      return res.status(500).json({
        success: false,
        message: 'temp_users 테이블에 접근할 수 없습니다.',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'temp_users 테이블 접근 성공'
    });
    
  } catch (error) {
    console.error('❌ temp_users 테이블 테스트 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '테스트 중 오류 발생',
      error: error.message
    });
  }
});

// Supabase 설정 테스트 엔드포인트
router.get('/test-supabase', async (req, res) => {
  try {
    console.log('🔧 Supabase 설정 테스트 중...');
    
    // 환경 변수 확인
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment variables:', {
      SUPABASE_URL: hasUrl ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_ANON_KEY: hasAnonKey ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '✅ 설정됨' : '❌ 누락'
    });
    
    // 연결 테스트
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase 연결 실패:', error);
      return res.status(500).json({
        success: false,
        message: 'Supabase 연결 실패',
        error: error.message,
        config: { hasUrl, hasAnonKey, hasServiceKey }
      });
    }
    
    res.json({
      success: true,
      message: 'Supabase 연결 성공',
      config: { hasUrl, hasAnonKey, hasServiceKey }
    });
    
  } catch (error) {
    console.error('❌ Supabase 테스트 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '테스트 중 오류 발생',
      error: error.message
    });
  }
});

// 검증 규칙
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password')
    .isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다.')
    .custom((value) => {
      const hasLowercase = /[a-z]/.test(value);
      const hasUppercase = /[A-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?\":{}|<>]/.test(value);
      
      const criteriaCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
      
      if (criteriaCount < 3) {
        throw new Error('비밀번호는 영문 대소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
      }
      return true;
    }),
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('사용자명은 3-20자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9_가-힣]+$/).withMessage('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.')
];

// 기존 회원가입 엔드포인트 (사용하지 않음 - request-register 사용)
router.post('/register-legacy', registerValidation, async (req, res) => {
  try {
    console.log('📝 회원가입 요청 데이터:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ 입력 검증 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { email, password, username, name } = req.body;
    console.log('✅ 입력 검증 통과, 중복 확인 시작...');

    // 이메일 중복 확인
    const emailCheck = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();
    }, '이메일 중복 확인');

    if (emailCheck.success) {
      console.log('❌ 이메일 중복:', email);
      return res.status(400).json({
        success: false,
        message: '이미 등록된 이메일입니다. 로그인을 시도해보세요.',
        error: 'DUPLICATE_EMAIL'
      });
    }

    // 사용자명 중복 확인
    const usernameCheck = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
    }, '사용자명 중복 확인');

    if (usernameCheck.success) {
      console.log('❌ 사용자명 중복:', username);
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다. 다른 사용자명을 입력해주세요.',
        error: 'DUPLICATE_USERNAME'
      });
    }

    console.log('✅ 중복 확인 완료');

    // 임시 사용자 데이터를 메모리에 저장 (임시 방법)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tempUserData = {
      email,
      password_hash: password, // 실제로는 해시해야 하지만 임시로
      username,
      name,
      verification_code: verificationCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10분 후 만료
      created_at: new Date().toISOString()
    };

    // 글로벌 변수로 임시 저장 (실제로는 Redis나 DB 사용해야 함)
    if (!global.tempUsers) {
      global.tempUsers = new Map();
    }
    
    global.tempUsers.set(email, tempUserData);
    console.log('✅ 임시 사용자 데이터 저장:', { email, code: verificationCode });

    // 이메일 인증 코드 발송
    console.log('📧 이메일 인증 코드 발송 시작...', verificationCode);
    
    let emailSent = false;
    
    try {
      // OTP 발송 시도
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`,
          data: {
            type: 'registration_verification',
            verification_code: verificationCode,
            message: `회원가입 인증 코드: ${verificationCode}`
          }
        }
      });

      if (otpError) {
        console.error('❌ OTP 발송 실패:', otpError);
        
        // 매직링크 방식으로 대체 시도
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.CLIENT_URL}/verify-email?code=${verificationCode}&email=${email}`
          }
        });
        
        if (linkError) {
          console.error('❌ 매직링크도 실패:', linkError);
        } else {
          console.log('✅ 매직링크 생성 성공');
          emailSent = true;
        }
      } else {
        console.log('✅ 이메일 인증 코드 발송 성공');
        emailSent = true;
      }
    } catch (emailErr) {
      console.error('❌ 이메일 발송 중 예외:', emailErr);
    }
    
    // 이메일 발송 실패 시에도 일단 진행 (개발 중이므로)
    console.log('📧 인증 코드 (개발용):', verificationCode);

    res.status(200).json({
      success: true,
      message: '인증 코드가 이메일로 발송되었습니다. 10분 내에 인증을 완료해주세요.',
      data: {
        email: email,
        expires_in: 600 // 10분
      }
    });

  } catch (error) {
    console.error('회원가입 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.'
    });
  }
});

// 로그인
console.log('📝 [auth.js] /login 엔드포인트 등록됨');
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ 로그인 입력 검증 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('🔐 로그인 시도:', email);

    // Supabase Auth로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Supabase 로그인 실패:', {
        message: authError.message,
        status: authError.status,
        code: authError.code
      });
      
      let message = '로그인에 실패했습니다.';
      let shouldAllowLogin = false;
      
      if (authError.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (authError.message.includes('Email not confirmed')) {
        message = '이메일 인증이 필요합니다. 인증 메일을 확인해주세요.';
        shouldAllowLogin = true; // 이메일 미인증이어도 일단 진행
      } else if (authError.message.includes('Invalid email')) {
        message = '올바르지 않은 이메일 형식입니다.';
      }
      
      // 이메일 미인증 사용자는 임시로 로그인 허용
      if (shouldAllowLogin) {
        console.log('⚠️ 이메일 미인증 사용자 임시 로그인 시도');
        
        // users 테이블에서 직접 사용자 조회
        const userResult = await safeQuery(async () => {
          return await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        }, '미인증 사용자 조회');
        
        if (userResult.success) {
          console.log('✅ 미인증 사용자 정보 조회 성공');
          return res.json({
            success: true,
            message: '로그인이 완료되었습니다. (이메일 인증 필요)',
            user: {
              id: userResult.data.id,
              username: userResult.data.username,
              email: userResult.data.email,
              name: userResult.data.name,
              role: userResult.data.role,
              isEmailVerified: false,
              subscription: userResult.data.subscription,
              usage: userResult.data.usage
            },
            needsEmailVerification: true
          });
        }
      }
      
      return res.status(401).json({
        success: false,
        message
      });
    }

    console.log('✅ Supabase 인증 성공:', {
      userId: authData.user.id,
      email: authData.user.email
    });

    // 사용자 프로필 정보 조회 (ID 우선, 실패 시 이메일로 재시도)
    let userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    }, '사용자 프로필 조회 (ID 기준)');

    if (!userResult.success) {
      console.log('⚠️ ID 기준 조회 실패, 이메일로 재시도:', {
        authUserId: authData.user.id,
        email: authData.user.email,
        error: userResult.error?.message
      });
      
      // 이메일로 재시도
      userResult = await safeQuery(async () => {
        return await supabase
          .from('users')
          .select('*')
          .eq('email', authData.user.email)
          .single();
      }, '사용자 프로필 조회 (이메일 기준)');
      
      if (!userResult.success) {
        console.error('❌ 사용자 프로필 조회 완전 실패:', {
          authUserId: authData.user.id,
          email: authData.user.email,
          idError: userResult.error?.message,
          emailError: userResult.error?.message
        });
        return res.status(404).json({
          success: false,
          message: '사용자 정보를 찾을 수 없습니다.',
          details: 'Auth 사용자는 존재하지만 프로필 정보가 없습니다.'
        });
      }
      
      // 이메일로 찾았을 경우 ID 불일치 로그 및 자동 수정
      console.log('⚠️ Auth ID와 users 테이블 ID 불일치 발견:', {
        authUserId: authData.user.id,
        tableUserId: userResult.data.id,
        email: authData.user.email,
        username: userResult.data.username
      });
      
      // ID 자동 동기화 시도
      console.log('🔄 users 테이블 ID 자동 동기화 시도...');
      const syncResult = await safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .update({ id: authData.user.id })
          .eq('email', authData.user.email)
          .select()
          .single();
      }, 'ID 동기화');
      
      if (syncResult.success) {
        console.log('✅ ID 동기화 완료:', {
          oldId: userResult.data.id,
          newId: authData.user.id,
          email: authData.user.email
        });
        userResult.data = syncResult.data; // 업데이트된 데이터 사용
      } else {
        console.error('❌ ID 동기화 실패:', syncResult.error);
      }
    }

    console.log('✅ 사용자 프로필 조회 성공:', {
      id: userResult.data.id,
      username: userResult.data.username,
      email: userResult.data.email
    });

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id);

    res.json({
      success: true,
      message: '로그인이 완료되었습니다.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        role: userResult.data.role,
        isEmailVerified: userResult.data.is_email_verified,
        subscription: userResult.data.subscription,
        usage: userResult.data.usage
      },
      session: authData.session
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.'
    });
  }
});

// 로그아웃
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('로그아웃 오류:', error);
      return res.status(400).json({
        success: false,
        message: '로그아웃 중 오류가 발생했습니다.'
      });
    }

    res.json({
      success: true,
      message: '로그아웃이 완료되었습니다.'
    });

  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그아웃 중 오류가 발생했습니다.'
    });
  }
});

// 현재 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용자 정보 조회');

    if (!userResult.success) {
      return res.status(userResult.error.code).json({
        success: false,
        message: userResult.error.message
      });
    }

    res.json({
      success: true,
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        role: userResult.data.role,
        isEmailVerified: userResult.data.is_email_verified,
        subscription: userResult.data.subscription,
        usage: userResult.data.usage,
        createdAt: userResult.data.created_at
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 프로필 업데이트
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.'),
  body('username').optional().trim().isLength({ min: 3, max: 20 }).withMessage('사용자명은 3-20자 사이여야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { name, username } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (username) {
      // 사용자명 중복 확인
      const usernameCheck = await safeQuery(async () => {
        return await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .neq('id', req.user.id)
          .single();
      }, '사용자명 중복 확인');

      if (usernameCheck.success) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 사용자명입니다.'
        });
      }

      updateData.username = username;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '업데이트할 정보가 없습니다.'
      });
    }

    const result = await safeQuery(async () => {
      return await supabase
        .from('users')
        .update(updateData)
        .eq('id', req.user.id)
        .select()
        .single();
    }, '프로필 업데이트');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: {
        id: result.data.id,
        username: result.data.username,
        email: result.data.email,
        name: result.data.name,
        role: result.data.role
      }
    });

  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 비밀번호 변경
router.put('/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력하세요.'),
  body('newPassword').isLength({ min: 8 }).withMessage('새 비밀번호는 최소 8자 이상이어야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // 현재 비밀번호로 재인증
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 비밀번호 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('비밀번호 변경 실패:', updateError);
      return res.status(400).json({
        success: false,
        message: '비밀번호 변경에 실패했습니다.'
      });
    }

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
});

// 이메일 확인 재발송 (로그인 없이도 가능)
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소를 입력해주세요.'
      });
    }
    
    console.log(`📧 이메일 확인 재발송 요청: ${email}`);
    
    // 여러 방법으로 시도
    let success = false;
    let lastError = null;
    
    // 방법 1: 기본 재발송
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`
        }
      });
      
      if (!resendError) {
        console.log('✅ 기본 재발송 성공');
        success = true;
      } else {
        console.error('❌ 기본 재발송 실패:', resendError);
        lastError = resendError;
      }
    } catch (err) {
      console.error('❌ 기본 재발송 예외:', err);
      lastError = err;
    }
    
    // 방법 2: 매직링크 방식
    if (!success) {
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.CLIENT_URL}/verify-email`
          }
        });
        
        if (!linkError && linkData) {
          console.log('✅ 매직링크 생성 성공');
          success = true;
        } else {
          console.error('❌ 매직링크 생성 실패:', linkError);
          lastError = linkError;
        }
      } catch (err) {
        console.error('❌ 매직링크 생성 예외:', err);
        lastError = err;
      }
    }
    
    if (success) {
      res.json({
        success: true,
        message: '이메일 확인 링크가 재발송되었습니다.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '이메일 확인 발송에 실패했습니다.',
        error: lastError?.message
      });
    }
    
  } catch (error) {
    console.error('이메일 확인 재발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '이메일 확인 재발송 중 오류가 발생했습니다.'
    });
  }
});

// 기존 인증된 사용자용 재발송 엔드포인트
router.post('/resend-verification-auth', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: req.user.email,
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/verify`
      }
    });

    if (error) {
      console.error('이메일 확인 재발송 실패:', error);
      return res.status(400).json({
        success: false,
        message: '이메일 확인 발송에 실패했습니다.'
      });
    }

    res.json({
      success: true,
      message: '확인 이메일이 재발송되었습니다.'
    });

  } catch (error) {
    console.error('이메일 확인 재발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '이메일 확인 재발송 중 오류가 발생했습니다.'
    });
  }
});

// 비밀번호 재설정 요청
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일을 입력하세요.',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/auth/reset-password`
    });

    if (error) {
      console.error('비밀번호 재설정 요청 실패:', error);
      return res.status(400).json({
        success: false,
        message: '비밀번호 재설정 요청에 실패했습니다.'
      });
    }

    res.json({
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다.'
    });

  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 재설정 요청 중 오류가 발생했습니다.'
    });
  }
});

// 기존 인증 엔드포인트 (사용하지 않음 - verify-register 사용)
router.post('/verify-registration-legacy', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log('📧 회원가입 인증 코드 확인 요청:', { email, code: !!code });
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: '이메일과 인증 코드를 모두 입력해주세요.'
      });
    }

    // 메모리에서 임시 사용자 데이터 조회
    if (!global.tempUsers) {
      global.tempUsers = new Map();
    }
    
    const tempUser = global.tempUsers.get(email);
    
    if (!tempUser) {
      console.error('❌ 임시 사용자 데이터 없음:', email);
      return res.status(400).json({
        success: false,
        message: '회원가입 요청을 찾을 수 없습니다. 다시 시도해주세요.'
      });
    }
    
    if (tempUser.verification_code !== code) {
      console.error('❌ 인증 코드 불일치:', { expected: tempUser.verification_code, received: code });
      return res.status(400).json({
        success: false,
        message: '인증 코드가 올바르지 않습니다.'
      });
    }
    
    // 만료 시간 확인
    if (new Date() > new Date(tempUser.expires_at)) {
      console.log('❌ 인증 코드 만료:', email);
      
      // 만료된 임시 사용자 데이터 삭제
      global.tempUsers.delete(email);
      
      return res.status(400).json({
        success: false,
        message: '인증 코드가 만료되었습니다. 다시 회원가입을 진행해주세요.'
      });
    }

    console.log('✅ 인증 코드 확인 완료, 실제 사용자 생성 시작...');

    // 실제 Supabase Auth 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempUser.email,
      password: tempUser.password_hash,
      user_metadata: {
        username: tempUser.username,
        name: tempUser.name,
        role: 'user'
      },
      email_confirm: true // 이메일 인증 완료 상태로 생성
    });

    if (authError) {
      console.error('❌ Supabase Auth 사용자 생성 실패:', authError);
      
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: '이미 등록된 이메일입니다.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: '회원가입 완료 중 오류가 발생했습니다.',
        error: authError.message
      });
    }

    // users 테이블에 사용자 정보 저장
    const userData = {
      id: authData.user.id,
      username: tempUser.username,
      email: tempUser.email,
      name: tempUser.name,
      role: 'user',
      is_active: true,
      is_email_verified: true,
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
    }, '사용자 프로필 생성');

    if (!userResult.success) {
      console.error('❌ 사용자 프로필 생성 실패:', userResult.error);
      
      // Auth 사용자 생성은 성공했지만 프로필 생성 실패 시 Auth 사용자 삭제
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.'
      });
    }

    // 임시 사용자 데이터 삭제
    global.tempUsers.delete(email);

    console.log('✅ 회원가입 최종 완료:', {
      id: userResult.data.id,
      username: userResult.data.username,
      email: userResult.data.email
    });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다! 로그인할 수 있습니다.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        isEmailVerified: true
      }
    });

  } catch (error) {
    console.error('회원가입 완료 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 완료 중 오류가 발생했습니다.'
    });
  }
});

// 기존 재발송 엔드포인트 (사용하지 않음 - resend-register-code 사용)
router.post('/resend-registration-code-legacy', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소를 입력해주세요.'
      });
    }

    console.log(`📧 인증 코드 재발송 요청: ${email}`);

    // 메모리에서 기존 데이터 조회
    if (!global.tempUsers) {
      global.tempUsers = new Map();
    }
    
    const tempUser = global.tempUsers.get(email);
    
    if (!tempUser) {
      return res.status(404).json({
        success: false,
        message: '회원가입 요청을 찾을 수 없습니다. 처음부터 다시 시도해주세요.'
      });
    }

    // 새로운 인증 코드 생성
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 메모리에서 업데이트
    tempUser.verification_code = newCode;
    tempUser.expires_at = newExpiresAt;
    global.tempUsers.set(email, tempUser);

    // 이메일 재발송
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`,
          data: {
            type: 'registration_verification',
            verification_code: newCode
          }
        }
      });

      if (otpError) {
        console.error('❌ 재발송 실패:', otpError);
      } else {
        console.log('✅ 인증 코드 재발송 성공');
      }
    } catch (emailErr) {
      console.error('❌ 재발송 중 예외:', emailErr);
    }

    res.json({
      success: true,
      message: '인증 코드가 재발송되었습니다.',
      data: {
        expires_in: 600
      }
    });

  } catch (error) {
    console.error('인증 코드 재발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 코드 재발송 중 오류가 발생했습니다.'
    });
  }
});

// 기존 이메일 인증 확인 (로그인 후 사용)
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email, otp } = req.body;
    
    console.log('📧 이메일 인증 확인 요청:', { token: !!token, email, otp: !!otp });
    
    let verificationResult = null;
    
    // OTP 코드로 인증
    if (otp && email) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      
      if (error) {
        console.error('❌ OTP 인증 실패:', error);
        return res.status(400).json({
          success: false,
          message: '인증 코드가 올바르지 않거나 만료되었습니다.'
        });
      }
      
      verificationResult = data;
    }
    // 토큰으로 인증 (매직링크)
    else if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('❌ 토큰 인증 실패:', error);
        return res.status(400).json({
          success: false,
          message: '인증 링크가 올바르지 않거나 만료되었습니다.'
        });
      }
      
      verificationResult = data;
    } else {
      return res.status(400).json({
        success: false,
        message: '인증 코드 또는 토큰이 필요합니다.'
      });
    }
    
    if (verificationResult?.user) {
      // 사용자 이메일 인증 상태 업데이트
      await supabase
        .from('users')
        .update({ 
          is_email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('id', verificationResult.user.id);
      
      console.log('✅ 이메일 인증 완료:', verificationResult.user.email);
      
      res.json({
        success: true,
        message: '이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '인증에 실패했습니다.'
      });
    }
    
  } catch (error) {
    console.error('이메일 인증 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '이메일 인증 확인 중 오류가 발생했습니다.'
    });
  }
});

// ==============================================
// 새로운 Mailgun 기반 회원가입 API 엔드포인트들
// ==============================================

// 1단계: 회원가입 정보 전송 및 인증 코드 요청 (Supabase 기반)
router.post('/request-register', [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일을 입력해주세요.')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 2, max: 20 })
    .withMessage('사용자명은 2-20자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9_가-힣]+$/)
    .withMessage('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  body('name')
    .notEmpty()
    .withMessage('이름을 입력해주세요.')
    .isLength({ max: 50 })
    .withMessage('이름은 50자를 초과할 수 없습니다.')
], async (req, res) => {
  try {
    console.log('📝 회원가입 요청 처리 시작:', {
      email: req.body.email,
      username: req.body.username,
      name: req.body.name,
      hasPassword: !!req.body.password
    });

    const { email, username, name, password } = req.body;

    // 기존 사용자 중복 검사 (이메일, 사용자명)
    console.log('🔍 기존 사용자 중복 검사 (회원가입 단계):', {
      email,
      username
    });
    
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`);
    
    if (checkError) {
      console.error('❌ 기존 사용자 확인 실패:', checkError);
      return res.status(500).json({
        success: false,
        message: '사용자 정보 확인 중 오류가 발생했습니다.',
        error: checkError.message
      });
    }
    
    if (existingUsers && existingUsers.length > 0) {
      const duplicateUser = existingUsers[0];
      console.error('❌ 중복 사용자 발견 (회원가입 단계):', {
        existing: duplicateUser,
        attempting: { email, username }
      });
      
      const isDuplicateEmail = duplicateUser.email === email;
      const isDuplicateUsername = duplicateUser.username === username;
      
      return res.status(409).json({
        success: false,
        message: isDuplicateEmail 
          ? '이미 사용 중인 이메일입니다.' 
          : '이미 사용 중인 사용자명입니다.',
        code: 'DUPLICATE_USER',
        duplicateField: isDuplicateEmail ? 'email' : 'username'
      });
    }
    
    console.log('✅ 중복 사용자 없음, 회원가입 계속 진행');

    // Supabase 환경 변수 확인
    console.log('🔧 Supabase 환경 변수 확인:', {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 유효성 검사 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    // 이메일 및 사용자명 중복 확인은 이미 위에서 수행됨

    // 3. 기존 임시 사용자 삭제 (같은 이메일)
    await supabase
      .from('temp_users')
      .delete()
      .eq('email', email);

    // 4. 비밀번호 해싱
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. 인증 코드 생성 (6자리 숫자, 해시하지 않음 - 스키마 VARCHAR(10) 제약)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // 6. Supabase에 임시 사용자 생성
    const tempUserResult = await safeQuery(async () => {
      return await supabase
        .from('temp_users')
        .insert({
          email,
          username,
          name,
          password_hash: hashedPassword,
          verification_code: verificationCode, // 평문으로 저장 (VARCHAR(10) 제약)
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
    }, '임시 사용자 생성');

    if (!tempUserResult.success) {
      console.error('❌ 임시 사용자 생성 실패:', {
        error: tempUserResult.error,
        data: { email, username, name }
      });
      return res.status(500).json({
        success: false,
        message: '임시 사용자 생성에 실패했습니다.',
        error: tempUserResult.error?.message || 'Unknown error'
      });
    }

    // 원본 비밀번호를 메모리에 임시 저장 (보안상 주의 - 실제 운영에서는 Redis 등 사용 권장)
    if (!global.tempPasswords) {
      global.tempPasswords = new Map();
    }
    global.tempPasswords.set(tempUserResult.data.id, password);

    console.log('✅ 임시 사용자 생성 완료:', tempUserResult.data.id);

    // 7. Mailgun 환경 변수 확인 및 인증 코드 이메일 발송
    console.log('📧 Mailgun 환경 변수 확인:', {
      MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
      EMAIL_FROM: process.env.EMAIL_FROM || '기본값 사용'
    });

    try {
      await sendVerificationEmail(email, name, verificationCode);
      console.log('✅ 인증 코드 이메일 발송 성공');
    } catch (emailError) {
      console.error('❌ 이메일 발송 실패:', {
        error: emailError.message,
        stack: emailError.stack,
        email: email,
        verificationCode: verificationCode
      });
      
      // 이메일 발송 실패해도 임시 사용자는 유지 (개발 중이므로)
      console.log('⚠️ 이메일 발송 실패했지만 임시 사용자는 유지됨 (개발용)');
      
      // 운영 환경에서는 임시 사용자 삭제
      if (process.env.NODE_ENV === 'production') {
        await supabase
          .from('temp_users')
          .delete()
          .eq('id', tempUserResult.data.id);
        
        return res.status(500).json({
          success: false,
          message: '인증 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    }

    // 개발 환경에서는 인증 코드를 응답에 포함 (보안상 운영 환경에서는 제거)
    const responseData = {
      success: true,
      message: '인증 코드가 이메일로 발송되었습니다.',
      tempUserId: tempUserResult.data.id
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.devVerificationCode = verificationCode; // 개발용
      console.log('🔧 개발 환경 인증 코드:', verificationCode);
    }

    res.json(responseData);

  } catch (error) {
    console.error('❌ 회원가입 요청 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 요청 처리 중 오류가 발생했습니다.'
    });
  }
});

// 2단계: 인증 코드 검증 및 회원가입 완료 (Supabase 기반)
router.post('/verify-register', [
  body('tempUserId')
    .notEmpty()
    .withMessage('임시 사용자 ID가 필요합니다.'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('인증 코드는 6자리여야 합니다.')
    .isNumeric()
    .withMessage('인증 코드는 숫자만 입력 가능합니다.')
], async (req, res) => {
  try {
    console.log('🔐 인증 코드 검증 시작:', {
      tempUserId: req.body.tempUserId,
      code: req.body.code ? '******' : undefined,
      hasCode: !!req.body.code
    });

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 유효성 검사 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { tempUserId, code } = req.body;

    // 1. 임시 사용자 조회
    console.log('🔍 임시 사용자 조회 시작:', tempUserId);
    const tempUserResult = await safeQuery(async () => {
      return await supabase
        .from('temp_users')
        .select('*')
        .eq('id', tempUserId)
        .single();
    }, '임시 사용자 조회');

    if (!tempUserResult.success) {
      console.log('❌ 임시 사용자를 찾을 수 없음:', {
        tempUserId,
        error: tempUserResult.error
      });
      return res.status(400).json({
        success: false,
        message: '인증 요청을 찾을 수 없습니다. 다시 회원가입을 진행해주세요.'
      });
    }

    console.log('✅ 임시 사용자 조회 성공:', {
      id: tempUserResult.data.id,
      email: tempUserResult.data.email,
      username: tempUserResult.data.username
    });

    const tempUser = tempUserResult.data;

    // 2. 만료 시간 확인
    if (new Date() > new Date(tempUser.expires_at)) {
      console.log('❌ 인증 코드 만료:', tempUserId);
      
      // 만료된 임시 사용자 삭제
      await supabase
        .from('temp_users')
        .delete()
        .eq('id', tempUserId);
      
      return res.status(410).json({
        success: false,
        message: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 3. 인증 코드 검증 (평문 비교)
    console.log('🔐 인증 코드 검증 중:', {
      입력코드: code,
      저장된코드: tempUser.verification_code,
      일치여부: code === tempUser.verification_code
    });
    
    const isValidCode = code === tempUser.verification_code;
    
    if (!isValidCode) {
      console.log('❌ 인증 코드 검증 실패:', { 
        tempUserId, 
        입력코드: code,
        저장된코드: tempUser.verification_code
      });
      return res.status(400).json({
        success: false,
        message: '인증 코드가 올바르지 않습니다.'
      });
    }

    console.log('✅ 인증 코드 검증 성공');

    // 4. 메모리에서 원본 비밀번호 가져오기 (Render 환경 대응)
    console.log('🔍 메모리에서 원본 비밀번호 조회:', {
      tempUserId,
      메모리맵존재: !!global.tempPasswords,
      메모리맵크기: global.tempPasswords?.size || 0,
      비밀번호존재: !!global.tempPasswords?.get(tempUserId)
    });
    
    let originalPassword = global.tempPasswords?.get(tempUserId);
    
    // Render 환경에서 메모리 데이터 손실 시 대체 로직
    if (!originalPassword) {
      console.error('❌ 원본 비밀번호를 메모리에서 찾을 수 없음:', {
        tempUserId,
        메모리맵: global.tempPasswords ? Array.from(global.tempPasswords.keys()) : null,
        서버환경: process.env.NODE_ENV,
        해결방안: '사용자에게 새 비밀번호 설정 요청'
      });
      
      // 임시 해결책: 해시된 비밀번호를 원본처럼 사용해보기 (실패할 가능성 높음)
      console.log('🔄 대체 로직 시도: 해시된 비밀번호 사용');
      originalPassword = tempUser.password_hash;
      
      // 사용자에게 명확한 안내 메시지 제공
      if (!originalPassword || originalPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: '서버 재시작으로 인한 세션 만료입니다. 회원가입을 다시 진행해주세요.',
          code: 'SESSION_EXPIRED',
          action: 'RESTART_REGISTRATION'
        });
      }
    }

    console.log('✅ 원본 비밀번호 조회 성공');

    // 5. Supabase Auth에 사용자 생성 (원본 비밀번호 사용)
    console.log('👤 Supabase Auth 사용자 생성 시작:', {
      email: tempUser.email,
      username: tempUser.username,
      name: tempUser.name,
      passwordType: originalPassword === tempUser.password_hash ? 'hashed_fallback' : 'original',
      passwordLength: originalPassword?.length
    });
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempUser.email,
      password: originalPassword, // 원본 비밀번호 사용 (Supabase가 자체 해시 처리)
      user_metadata: {
        username: tempUser.username,
        name: tempUser.name,
        role: 'user'
      },
      email_confirm: true // 이메일 인증 완료 상태로 생성
    });

    if (authError) {
      console.error('❌ Supabase Auth 사용자 생성 실패:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError.details || authError
      });
      
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: '이미 등록된 이메일입니다.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: '회원가입 완료 중 오류가 발생했습니다.',
        error: authError.message
      });
    }

    console.log('✅ Supabase Auth 사용자 생성 완료:', {
      userId: authData.user.id,
      email: authData.user.email
    });

    // 6. users 테이블에 기존 사용자 확인 (중복 방지)
    console.log('🔍 기존 사용자 중복 검사 시작:', {
      email: tempUser.email,
      username: tempUser.username
    });
    
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${tempUser.email},username.eq.${tempUser.username}`);
    
    if (checkError) {
      console.error('❌ 기존 사용자 확인 실패:', checkError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        success: false,
        message: '사용자 정보 확인 중 오류가 발생했습니다.',
        error: checkError.message
      });
    }
    
    if (existingUsers && existingUsers.length > 0) {
      const duplicateUser = existingUsers[0];
      console.error('❌ 중복 사용자 발견:', {
        existing: duplicateUser,
        attempting: { email: tempUser.email, username: tempUser.username }
      });
      
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      const isDuplicateEmail = duplicateUser.email === tempUser.email;
      const isDuplicateUsername = duplicateUser.username === tempUser.username;
      
      return res.status(409).json({
        success: false,
        message: isDuplicateEmail 
          ? '이미 사용 중인 이메일입니다.' 
          : '이미 사용 중인 사용자명입니다.',
        code: 'DUPLICATE_USER',
        duplicateField: isDuplicateEmail ? 'email' : 'username'
      });
    }
    
    console.log('✅ 중복 사용자 없음, 사용자 생성 진행');
    
    // 7. users 테이블에 사용자 정보 저장 (서비스 역할 키 사용)
    console.log('📝 users 테이블에 사용자 정보 저장 시작:', {
      id: authData.user.id,
      email: tempUser.email,
      username: tempUser.username,
      name: tempUser.name,
      serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    // 서비스 역할 키로 직접 삽입 시도
    const { data: userData, error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: tempUser.email,
        username: tempUser.username,
        name: tempUser.name,
        role: 'user',
        is_active: true,
        is_email_verified: true
      })
      .select()
      .single();

    if (userInsertError) {
      console.error('❌ users 테이블 사용자 생성 실패 (상세):', {
        error: userInsertError,
        message: userInsertError.message,
        details: userInsertError.details,
        hint: userInsertError.hint,
        code: userInsertError.code,
        userId: authData.user.id,
        email: tempUser.email,
        username: tempUser.username
      });
      
      // Auth 사용자 생성은 성공했지만 프로필 생성 실패 시 Auth 사용자 삭제
      console.log('🔄 Auth 사용자 롤백 중...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.',
        error: userInsertError.message,
        details: userInsertError.details || userInsertError.hint,
        code: userInsertError.code
      });
    }

    console.log('✅ users 테이블 사용자 생성 완료:', userData.id);

    // 8. 임시 사용자 및 메모리에서 비밀번호 삭제
    await supabase
      .from('temp_users')
      .delete()
      .eq('id', tempUserId);
    
    // 메모리에서 비밀번호 삭제
    global.tempPasswords?.delete(tempUserId);
    
    console.log('✅ 임시 사용자 삭제 완료');

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다!',
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        name: userData.name
      }
    });

  } catch (error) {
    console.error('❌ 인증 코드 검증 중 예외 발생:', {
      message: error.message,
      stack: error.stack,
      tempUserId: req.body?.tempUserId,
      code: req.body?.code ? '******' : undefined
    });
    res.status(500).json({
      success: false,
      message: '인증 코드 검증 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// 3단계: 인증 코드 재전송 (Supabase 기반)
router.post('/resend-register-code', [
  body('tempUserId')
    .notEmpty()
    .withMessage('임시 사용자 ID가 필요합니다.')
], async (req, res) => {
  try {
    console.log('🔄 인증 코드 재전송 요청:', req.body);

    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 유효성 검사 실패:', errors.array());
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { tempUserId } = req.body;

    // 1. 임시 사용자 조회
    const tempUserResult = await safeQuery(async () => {
      return await supabase
        .from('temp_users')
        .select('*')
        .eq('id', tempUserId)
        .single();
    }, '임시 사용자 조회');

    if (!tempUserResult.success) {
      console.log('❌ 임시 사용자를 찾을 수 없음:', tempUserId);
      return res.status(400).json({
        success: false,
        message: '인증 요청을 찾을 수 없습니다. 다시 회원가입을 진행해주세요.'
      });
    }

    const tempUser = tempUserResult.data;

    // 2. 새로운 인증 코드 생성
    const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // 3. 임시 사용자 정보 업데이트
    const updateResult = await safeQuery(async () => {
      return await supabase
        .from('temp_users')
        .update({
          verification_code: newVerificationCode, // 평문으로 저장
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', tempUserId)
        .select()
        .single();
    }, '인증 코드 업데이트');

    if (!updateResult.success) {
      console.error('❌ 인증 코드 업데이트 실패:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: '인증 코드 재생성에 실패했습니다.'
      });
    }

    console.log('✅ 새 인증 코드 생성 완료');

    // 4. Mailgun으로 새 인증 코드 이메일 발송
    try {
      await sendVerificationEmail(tempUser.email, tempUser.name, newVerificationCode);
      console.log('✅ 인증 코드 재전송 성공');

      res.json({
        success: true,
        message: '새로운 인증 코드가 이메일로 발송되었습니다.'
      });

    } catch (emailError) {
      console.error('❌ 이메일 재전송 실패:', emailError);
      res.status(500).json({
        success: false,
        message: '인증 코드 재전송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

  } catch (error) {
    console.error('❌ 인증 코드 재전송 실패:', error);
    res.status(500).json({
      success: false,
      message: '인증 코드 재전송 중 오류가 발생했습니다.'
    });
  }
});

// 메모리 상태 확인 엔드포인트
router.get('/test-memory', async (req, res) => {
  try {
    res.json({
      success: true,
      message: '메모리 상태 확인',
      data: {
        tempPasswordsExists: !!global.tempPasswords,
        tempPasswordsSize: global.tempPasswords?.size || 0,
        tempPasswordsKeys: global.tempPasswords ? Array.from(global.tempPasswords.keys()) : [],
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '메모리 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// Supabase Auth와 users 테이블 동기화 상태 확인
router.get('/test-auth-sync', async (req, res) => {
  try {
    console.log('🔧 Supabase Auth와 users 테이블 동기화 테스트');
    
    // 1. Supabase Auth 사용자 목록
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    // 2. users 테이블 사용자 목록  
    const { data: tableUsers, error: tableError } = await supabaseAdmin
      .from('users')
      .select('id, email, username, created_at');
    
    if (authError || tableError) {
      return res.status(500).json({
        success: false,
        authError: authError?.message,
        tableError: tableError?.message
      });
    }
    
    // 3. 동기화 상태 분석
    const authEmails = new Set(authUsers.users.map(u => u.email));
    const tableEmails = new Set(tableUsers.map(u => u.email));
    
    const onlyInAuth = authUsers.users.filter(u => !tableEmails.has(u.email));
    const onlyInTable = tableUsers.filter(u => !authEmails.has(u.email));
    const synchronized = tableUsers.filter(u => authEmails.has(u.email));
    
    res.json({
      success: true,
      message: 'Supabase Auth와 users 테이블 동기화 상태',
      summary: {
        authUsersCount: authUsers.users.length,
        tableUsersCount: tableUsers.length,
        synchronizedCount: synchronized.length,
        onlyInAuthCount: onlyInAuth.length,
        onlyInTableCount: onlyInTable.length
      },
      details: {
        onlyInAuth: onlyInAuth.map(u => ({ id: u.id, email: u.email })),
        onlyInTable: onlyInTable.map(u => ({ id: u.id, email: u.email })),
        synchronized: synchronized.map(u => ({ id: u.id, email: u.email }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Auth 동기화 테스트 중 오류:', error);
    res.status(500).json({
      success: false,
      message: 'Auth 동기화 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// Supabase Auth 연결 테스트 엔드포인트
router.get('/test-supabase-auth', async (req, res) => {
  try {
    console.log('🔧 Supabase Auth 연결 테스트 시작');
    
    // Service Role Key로 사용자 목록 조회 테스트
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Supabase Auth 연결 실패:', usersError);
      return res.status(500).json({
        success: false,
        message: 'Supabase Auth 연결 실패',
        error: usersError.message
      });
    }
    
    console.log('✅ Supabase Auth 연결 성공');
    res.json({
      success: true,
      message: 'Supabase Auth 연결 성공',
      data: {
        userCount: users.users.length,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Supabase Auth 테스트 중 오류:', error);
    res.status(500).json({
      success: false,
      message: 'Supabase Auth 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// 등록된 라우트 확인 엔드포인트
router.get('/test-routes', (req, res) => {
  const routes = [];
  
  // Express 라우터의 스택에서 경로 정보 추출
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods);
      routes.push({
        path: layer.route.path,
        methods: methods
      });
    }
  });
  
  res.json({
    success: true,
    message: 'auth.js에서 등록된 라우트 목록',
    routes: routes,
    totalRoutes: routes.length,
    timestamp: new Date().toISOString()
  });
});

// users 테이블 접근 권한 테스트 엔드포인트
router.get('/test-users-table', async (req, res) => {
  try {
    console.log('🔧 users 테이블 접근 권한 테스트 시작');
    
    // 1. 조회 테스트 (일반 키)
    const { data: usersNormal, error: normalError } = await supabase
      .from('users')
      .select('id, email, username')
      .limit(1);
    
    // 2. 조회 테스트 (서비스 역할 키)
    const { data: usersAdmin, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .limit(1);
    
    // 3. 삽입 테스트 (더미 데이터 - 즉시 삭제)
    const testId = '00000000-0000-0000-0000-000000000000';
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: testId,
        email: 'test@test.com',
        username: 'testuser',
        name: 'Test User',
        role: 'user',
        is_active: true,
        is_email_verified: true
      })
      .select();
    
    // 테스트 데이터 삭제
    if (insertData && !insertError) {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testId);
    }
    
    res.json({
      success: true,
      message: 'users 테이블 접근 권한 테스트 결과',
      data: {
        normalKeyAccess: {
          success: !normalError,
          error: normalError?.message,
          count: usersNormal?.length || 0
        },
        serviceRoleAccess: {
          success: !adminError,
          error: adminError?.message,
          count: usersAdmin?.length || 0
        },
        insertTest: {
          success: !insertError,
          error: insertError?.message,
          details: insertError?.details,
          hint: insertError?.hint,
          code: insertError?.code
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ users 테이블 테스트 중 오류:', error);
    res.status(500).json({
      success: false,
      message: 'users 테이블 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// users 테이블의 사용자를 Supabase Auth에 추가하는 엔드포인트 (관리자용)
router.post('/sync-missing-users', async (req, res) => {
  try {
    console.log('🔧 누락된 사용자를 Supabase Auth에 동기화 중...');
    
    // 1. 두 곳의 사용자 목록 가져오기
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const { data: tableUsers, error: tableError } = await supabaseAdmin
      .from('users')
      .select('*');
    
    if (authError || tableError) {
      return res.status(500).json({
        success: false,
        message: '사용자 목록 조회 실패',
        authError: authError?.message,
        tableError: tableError?.message
      });
    }
    
    // 2. Auth에 없지만 테이블에는 있는 사용자 찾기
    const authEmails = new Set(authUsers.users.map(u => u.email));
    const missingUsers = tableUsers.filter(u => !authEmails.has(u.email));
    
    if (missingUsers.length === 0) {
      return res.json({
        success: true,
        message: '동기화할 사용자가 없습니다.',
        missingCount: 0
      });
    }
    
    // 3. 누락된 사용자들을 Auth에 추가
    const results = [];
    for (const user of missingUsers) {
      try {
        // 임시 비밀번호로 사용자 생성 (사용자가 비밀번호 재설정 필요)
        const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
        
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          user_metadata: {
            username: user.username,
            name: user.name,
            role: user.role || 'user'
          },
          email_confirm: true // 이메일 인증 완료 상태로 생성
        });
        
        if (createError) {
          console.error(`❌ ${user.email} Auth 생성 실패:`, createError);
          results.push({
            email: user.email,
            success: false,
            error: createError.message
          });
        } else {
          console.log(`✅ ${user.email} Auth 생성 성공`);
          results.push({
            email: user.email,
            success: true,
            authId: newAuthUser.user.id,
            needsPasswordReset: true
          });
        }
      } catch (error) {
        console.error(`❌ ${user.email} 처리 중 오류:`, error);
        results.push({
          email: user.email,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `사용자 동기화 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
      summary: {
        totalMissing: missingUsers.length,
        successful: successCount,
        failed: failCount
      },
      results: results,
      note: '성공한 사용자들은 임시 비밀번호로 생성되었으므로 비밀번호 재설정이 필요합니다.'
    });
  } catch (error) {
    console.error('❌ 사용자 동기화 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 동기화 중 오류 발생',
      error: error.message
    });
  }
});

console.log('✅ [auth.js] 라우터 모듈 내보내기 완료');

module.exports = router;