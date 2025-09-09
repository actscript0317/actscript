const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const { authenticateJWT } = require('../middleware/jwtAuth');
const { generateTokenPair } = require('../utils/jwt');
const { createRefreshToken, deleteAllUserRefreshTokens } = require('../utils/refreshTokenManager');
// Mailgun removed - email verification disabled
// MongoDB 관련 의존성 모두 제거
const router = express.Router();

// 유효성 검증 규칙
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password')
    .isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  body('username')
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('사용자명은 2-20자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9_가-힣]+$/).withMessage('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.')
];

// 인증 코드 임시 저장소 (메모리 기반)
const verificationCodes = new Map();

// 인증 코드 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 만료된 인증 코드 정리 (주기적 실행)
function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [key, value] of verificationCodes.entries()) {
    if (now > value.expiresAt) {
      verificationCodes.delete(key);
      console.log(`🗑️ 만료된 인증 코드 삭제: ${value.email}`);
    }
  }
}

// 5분마다 만료된 코드 정리
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

// 회원가입 1단계: 이메일로 인증 코드 발송
router.post('/register', registerValidation, async (req, res) => {
  try {
    console.log('🚀 회원가입 요청 시작:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: errors.array()
      });
    }

    const { email, password, username, name } = req.body;

    // 이메일 중복 확인 (Admin 클라이언트 사용)
    const existingEmailResult = await safeQuery(async () => {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }
      return await supabaseAdmin
        .from('users')
        .select('email')
        .eq('email', email)
        .single();
    }, '이메일 중복 확인');

    if (existingEmailResult.success) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.',
        error: 'DUPLICATE_EMAIL'
      });
    }

    // 사용자명 중복 확인 (Admin 클라이언트 사용)
    const existingUserResult = await safeQuery(async () => {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }
      return await supabaseAdmin
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
    }, '사용자명 중복 확인');

    if (existingUserResult.success) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.',
        error: 'DUPLICATE_USERNAME'
      });
    }

    // 인증 코드 생성 및 저장
    const verificationCode = generateVerificationCode();
    const codeKey = `${email}_${Date.now()}`;
    
    // 인증 코드와 사용자 정보를 10분간 저장
    verificationCodes.set(codeKey, {
      email,
      password,
      username,
      name,
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10분 후 만료
    });

    // 기존 동일 이메일 인증 코드들 삭제 (최신 것만 유지)
    for (const [key, value] of verificationCodes.entries()) {
      if (value.email === email && key !== codeKey) {
        verificationCodes.delete(key);
      }
    }

    console.log(`📧 인증 코드 생성: ${email} -> ${verificationCode}`);

    // 인증 코드와 사용자 정보를 먼저 저장 (Auth 사용자는 인증 후 생성)
    verificationCodes.set(codeKey, {
      email,
      password,
      username,
      name,
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Mailgun 제거됨 - 개발용으로 콘솔에 인증 코드 출력
    console.log('🔧 [개발용] 이메일 인증 코드:', verificationCode);
    console.log('🔧 [개발용] 인증 키:', codeKey);

    res.json({
      success: true,
      message: '개발 환경: 인증 코드가 콘솔에 출력되었습니다.',
      data: {
        email,
        needsCodeVerification: true,
        codeKey,
        devCode: verificationCode // 개발용으로 코드 노출
      }
    });

  } catch (error) {
    console.error('❌ 회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 회원가입 2단계: 인증 코드 확인 및 회원가입 완료
router.post('/verify-code', [
  body('codeKey').notEmpty().withMessage('코드 키가 필요합니다.'),
  body('verificationCode').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6자리 숫자 코드를 입력하세요.')
], async (req, res) => {
  try {
    console.log('🔍 인증 코드 확인 요청:', req.body.codeKey);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '올바른 인증 코드를 입력하세요.',
        errors: errors.array()
      });
    }

    const { codeKey, verificationCode } = req.body;

    // 저장된 인증 코드 확인
    const storedData = verificationCodes.get(codeKey);
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: '인증 코드가 만료되었거나 존재하지 않습니다.',
        error: 'CODE_NOT_FOUND'
      });
    }

    // 만료 시간 확인
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(codeKey);
      return res.status(400).json({
        success: false,
        message: '인증 코드가 만료되었습니다. 다시 요청해주세요.',
        error: 'CODE_EXPIRED'
      });
    }

    // 인증 코드 일치 확인
    if (storedData.code !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: '인증 코드가 일치하지 않습니다.',
        error: 'CODE_MISMATCH'
      });
    }

    console.log('✅ 인증 코드 확인 완료:', storedData.email);

    const { email, password, username, name } = storedData;

    // Admin을 통해 이메일 인증된 상태로 Auth 사용자 생성
    let authData = null;
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 이메일 인증 강제 활성화
        user_metadata: {
          username,
          name,
          role: 'user'
        }
      });

      if (error) {
        console.error('❌ Admin을 통한 Auth 사용자 생성 실패:', error);
        
        let message = '회원가입에 실패했습니다.';
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          message = '이미 가입된 이메일입니다.';
        } else if (error.message.includes('Password should be at least')) {
          message = '비밀번호는 최소 8자 이상이어야 합니다.';
        }
        
        return res.status(400).json({
          success: false,
          message,
          error: error.message
        });
      }

      authData = data;
      console.log('✅ Admin을 통한 Auth 사용자 생성 완료:', authData.user.id);

    } catch (authError) {
      console.error('❌ Auth 사용자 생성 중 오류:', authError);
      return res.status(500).json({
        success: false,
        message: 'Auth 사용자 생성에 실패했습니다.',
        error: 'AUTH_CREATION_FAILED'
      });
    }

    try {
      // users 테이블에 사용자 정보 저장
      const userData = {
        id: authData.user.id,
        email,
        username,
        name,
        role: 'user',
        is_active: true,
        is_email_verified: true, // 인증 코드로 확인했으므로 true
        created_at: new Date().toISOString(),
        subscription: 'free',
        usage: {
          scripts_generated: 0,
          monthly_limit: 10
        }
      };

      const userResult = await safeQuery(async () => {
        if (!supabaseAdmin) {
          throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
        }
        return await supabaseAdmin
          .from('users')
          .insert(userData)
          .select()
          .single();
      }, '사용자 프로필 생성');

      if (!userResult.success) {
        console.error('❌ 사용자 프로필 생성 실패:', userResult.error);
        
        // Auth 사용자도 삭제 시도 (Admin 클라이언트 사용)
        try {
          if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('🗑️ Auth 사용자 삭제 완료');
          } else {
            console.warn('⚠️ Admin 클라이언트의 auth.admin이 사용 불가');
          }
        } catch (deleteError) {
          console.warn('⚠️ Auth 사용자 삭제 실패:', deleteError.message);
        }

        return res.status(500).json({
          success: false,
          message: '사용자 정보 저장에 실패했습니다.',
          error: 'PROFILE_CREATION_FAILED'
        });
      }

      // 인증 코드 삭제 (사용 완료)
      verificationCodes.delete(codeKey);

      console.log('🎉 회원가입 완료:', email);

      res.json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          id: userResult.data.id,
          username: userResult.data.username,
          email: userResult.data.email,
          name: userResult.data.name,
          role: userResult.data.role,
          isEmailVerified: userResult.data.is_email_verified,
          subscription: userResult.data.subscription,
          usage: userResult.data.usage
        }
      });

    } catch (signupError) {
      console.error('❌ 사용자 생성 전체 과정 실패:', signupError);
      
      // 인증 코드는 유지 (재시도 가능하도록)
      res.status(500).json({
        success: false,
        message: '회원가입 처리 중 오류가 발생했습니다.',
        error: 'SIGNUP_PROCESS_FAILED'
      });
    }

  } catch (error) {
    console.error('❌ 인증 코드 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 코드 확인 중 오류가 발생했습니다.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 로그인
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
      console.error('❌ 로그인 실패:', authError);
      
      let message = '로그인에 실패했습니다.';
      if (authError.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (authError.message.includes('Email not confirmed')) {
        message = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
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

    // 사용자 프로필 정보 조회 (ID 기준) - Admin 클라이언트 사용
    let userResult = await safeQuery(async () => {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    }, 'Supabase 사용자 프로필 조회 (ID 기준)');

    // 프로필이 없으면 이메일로 재시도
    if (!userResult.success) {
      console.log('⚠️ ID 기준 조회 실패, 이메일로 재시도:', {
        message: userResult.error,
        authUserId: authData.user.id,
        email: authData.user.email,
        error: '데이터를 찾을 수 없습니다.'
      });

      userResult = await safeQuery(async () => {
        if (!supabaseAdmin) {
          throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
        }
        return await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', authData.user.email)
          .single();
      }, 'Supabase 사용자 프로필 조회 (이메일 기준)');
    }

    // 여전히 프로필이 없으면 자동으로 생성
    if (!userResult.success) {
      console.log('⚠️ 사용자 프로필이 없음 - 자동 생성 시도:', {
        authUserId: authData.user.id,
        email: authData.user.email,
        idError: '데이터를 찾을 수 없습니다.',
        emailError: '데이터를 찾을 수 없습니다.'
      });

      // authData.user.user_metadata에서 회원가입 시 저장된 정보 추출
      const userData = authData.user.user_metadata || {};
      const username = userData.username || `user_${authData.user.id.slice(0, 8)}`;
      const name = userData.name || 'User';

      // 자동으로 사용자 프로필 생성 (Admin 클라이언트 사용)
      const createUserResult = await safeQuery(async () => {
        if (!supabaseAdmin) {
          throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
        }
        return await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            username: username,
            name: name,
            role: userData.role || 'user',
            is_active: true,
            is_email_verified: !!authData.user.email_confirmed_at,
            created_at: authData.user.created_at || new Date().toISOString(),
            subscription: 'free',
            usage: {
              scripts_generated: 0,
              monthly_limit: 10
            }
          })
          .select()
          .single();
      }, '사용자 프로필 자동 생성');

      if (createUserResult.success) {
        console.log('✅ 사용자 프로필 자동 생성 성공:', {
          userId: createUserResult.data.id,
          email: createUserResult.data.email,
          username: createUserResult.data.username
        });
        userResult = createUserResult;
      } else {
        console.log('❌ 사용자 프로필 조회 완전 실패:', {
          authUserId: authData.user.id,
          email: authData.user.email,
          idError: '데이터를 찾을 수 없습니다.',
          emailError: '데이터를 찾을 수 없습니다.'
        });
        return res.status(404).json({
          success: false,
          message: '사용자 정보를 찾을 수 없습니다.',
          details: 'Auth 사용자는 존재하지만 프로필 정보가 없습니다.'
        });
      }
    }

    // 마지막 로그인 시간 업데이트 (Admin 클라이언트 사용)
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);
    }

    // JWT 토큰 페어 생성
    const tokenPair = generateTokenPair(userResult.data.id, userResult.data.email);
    
    // Refresh Token 저장
    const refreshToken = await createRefreshToken(userResult.data.id, userResult.data.email);
    
    console.log('✅ 로그인 성공:', email);

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
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: refreshToken,
        expiresIn: tokenPair.expiresIn,
        refreshExpiresIn: tokenPair.refreshExpiresIn
      },
      // 기존 Supabase 세션도 유지 (호환성을 위해)
      session: authData.session
    });

  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.'
    });
  }
});

// 토큰 갱신
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('리프레시 토큰이 필요합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '리프레시 토큰이 필요합니다.',
        errors: errors.array()
      });
    }

    const { refreshToken } = req.body;
    const { verifyRefreshTokenData } = require('../utils/refreshTokenManager');

    // Refresh Token 검증
    let tokenData;
    try {
      tokenData = verifyRefreshTokenData(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // 사용자 정보 조회
    const userResult = await safeQuery(async () => {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', tokenData.userId)
        .single();
    }, '토큰 갱신 사용자 정보 조회');

    if (!userResult.success) {
      return res.status(401).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.data;

    // 비활성 사용자 체크
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: '비활성화된 계정입니다.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // 새로운 액세스 토큰 생성
    const newTokenPair = generateTokenPair(user.id, user.email);
    
    console.log('🔄 토큰 갱신 성공:', user.email);

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다.',
      tokens: {
        accessToken: newTokenPair.accessToken,
        expiresIn: newTokenPair.expiresIn
      }
    });

  } catch (error) {
    console.error('❌ 토큰 갱신 오류:', error);
    res.status(500).json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.',
      code: 'REFRESH_FAILED'
    });
  }
});

// 로그아웃
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    // 사용자의 모든 Refresh Token 삭제
    const deletedCount = deleteAllUserRefreshTokens(req.user.id);
    
    // Supabase 세션도 정리 (기존 호환성)
    try {
      await supabase.auth.signOut();
    } catch (supabaseError) {
      console.warn('Supabase 로그아웃 중 오류 (무시됨):', supabaseError.message);
    }

    console.log(`✅ 로그아웃 완료: ${req.user.email} (삭제된 토큰: ${deletedCount}개)`);

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
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용자 정보 조회');

    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
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
  body('username').optional().trim().isLength({ min: 2, max: 20 }).withMessage('사용자명은 2-20자 사이여야 합니다.')
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
      return res.status(500).json({
        success: false,
        message: '프로필 업데이트에 실패했습니다.'
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
    const clientUrl = process.env.CLIENT_URL || 'https://actscript-1.onrender.com';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${clientUrl}/auth/reset-password`
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

// 이메일 인증 완료 후 사용자 프로필 생성
router.post('/complete-signup', [
  body('userId').notEmpty().withMessage('사용자 ID가 필요합니다.'),
  body('email').isEmail().withMessage('올바른 이메일이 필요합니다.'),
  body('username').notEmpty().withMessage('사용자명이 필요합니다.'),
  body('name').notEmpty().withMessage('이름이 필요합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.',
        errors: errors.array()
      });
    }

    const { userId, email, username, name } = req.body;

    console.log('📝 사용자 프로필 생성 요청:', { userId, email, username, name });

    // 사용자명 중복 확인
    const usernameCheck = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
    }, '사용자명 중복 확인');

    if (usernameCheck.success) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.',
        error: 'DUPLICATE_USERNAME'
      });
    }

    // users 테이블에 사용자 정보 저장
    const userData = {
      id: userId,
      username,
      email,
      name,
      role: 'user',
      is_active: true,
      is_email_verified: true,
      created_at: new Date().toISOString()
    };

    const userResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .upsert(userData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
    }, '사용자 프로필 생성');

    if (!userResult.success) {
      console.error('❌ 사용자 프로필 생성 실패:', userResult.error);
      return res.status(500).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.'
      });
    }

    console.log('✅ 회원가입 완료:', email);

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        role: userResult.data.role,
        isEmailVerified: userResult.data.is_email_verified
      }
    });

  } catch (error) {
    console.error('❌ 회원가입 완료 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 완료 처리 중 오류가 발생했습니다.'
    });
  }
});


module.exports = router;