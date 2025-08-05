const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const router = express.Router();

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
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.')
];

// 회원가입
router.post('/register', registerValidation, async (req, res) => {
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
    console.log('✅ 입력 검증 통과, 사용자명 중복 확인 시작...');

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
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.'
      });
    }

    // 사용자명 중복 확인 중 오류 발생
    if (!usernameCheck.success && usernameCheck.error.code !== 404) {
      console.error('❌ 사용자명 중복 확인 중 오류:', usernameCheck.error);
      return res.status(500).json({
        success: false,
        message: '사용자명 확인 중 오류가 발생했습니다.',
        error: usernameCheck.error.message
      });
    }

    console.log('✅ 사용자명 사용 가능:', username);

    // Supabase Auth에 사용자 생성 (이메일 확인 비활성화)
    console.log('🔐 Supabase Auth 사용자 생성 시작...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        name,
        role: 'user'
      },
      email_confirm: false // 일단 이메일 확인 없이 계정 생성
    });

    if (authError) {
      console.error('Supabase Auth 사용자 생성 실패:', authError);
      
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: '이미 등록된 이메일입니다.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: '회원가입에 실패했습니다.',
        error: authError.message
      });
    }

    // users 테이블에 추가 정보 저장
    const userData = {
      id: authData.user.id,
      username,
      email,
      name,
      role: 'user',
      is_active: true,
      is_email_verified: false
    };

    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
    }, '사용자 프로필 생성');

    if (!userResult.success) {
      // Auth 사용자 생성은 성공했지만 프로필 생성 실패 시 Auth 사용자 삭제
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(userResult.error.code).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.'
      });
    }

    // 회원가입 완료 후 이메일 인증 코드 발송
    if (authData?.user) {
      console.log('✅ 사용자 생성 완료:', {
        id: authData.user.id,
        email: authData.user.email
      });

      // 이메일 인증 코드 발송 시도
      console.log('📧 이메일 인증 코드 발송 시작...');
      
      try {
        // OTP 발송
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`,
            data: {
              type: 'email_verification',
              user_id: authData.user.id
            }
          }
        });

        if (otpError) {
          console.error('❌ OTP 발송 실패:', otpError);
          
          // 대안: 매직링크 생성
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
              redirectTo: `${process.env.CLIENT_URL}/verify-email?user_id=${authData.user.id}`
            }
          });
          
          if (linkError) {
            console.error('❌ 매직링크 생성도 실패:', linkError);
          } else {
            console.log('✅ 매직링크 생성 성공:', linkData.properties?.action_link);
          }
        } else {
          console.log('✅ 이메일 인증 코드 발송 성공');
        }
      } catch (emailErr) {
        console.error('❌ 이메일 발송 중 예외:', emailErr);
      }
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        isEmailVerified: userResult.data.is_email_verified
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.'
    });
  }
});

// 로그인
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

    // 사용자 프로필 정보 조회
    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    }, '사용자 프로필 조회');

    if (!userResult.success) {
      console.error('❌ 사용자 프로필 조회 실패:', userResult.error);
      return res.status(userResult.error.code || 404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
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

// 이메일 인증 확인
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

module.exports = router;