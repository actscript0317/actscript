const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const router = express.Router();

console.log('🔄 [auth.js] 라우터 로딩 완료, 엔드포인트 등록 중...');

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

// 회원가입 (이메일 인증 필요)
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

    // 운영환경에 맞는 리다이렉트 URL 설정
    const clientUrl = process.env.CLIENT_URL || 'https://actscript-1.onrender.com';
    const redirectTo = `${clientUrl}/auth/callback`;
    
    console.log('📧 이메일 리다이렉트 URL:', redirectTo);

    // Supabase Auth에 사용자 생성 (이메일 인증 필요)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          name,
          role: 'user'
        },
        emailRedirectTo: redirectTo
      }
    });

    if (authError) {
      console.error('❌ 회원가입 실패:', authError);
      
      let message = '회원가입에 실패했습니다.';
      if (authError.message.includes('already registered')) {
        message = '이미 가입된 이메일입니다.';
      } else if (authError.message.includes('Password should be at least')) {
        message = '비밀번호는 최소 8자 이상이어야 합니다.';
      } else if (authError.message.includes('Unable to validate email')) {
        message = '이메일 형식이 올바르지 않습니다.';
      }
      
      return res.status(400).json({
        success: false,
        message,
        error: authError.message
      });
    }

    console.log('✅ 회원가입 Auth 생성 완료:', {
      userId: authData.user?.id,
      email: authData.user?.email,
      emailConfirmed: !!authData.user?.email_confirmed_at
    });

    // 이메일 인증이 필요한 경우
    if (!authData.user?.email_confirmed_at) {
      console.log('📧 이메일 인증 필요 - 인증 메일 발송됨');
      
      res.json({
        success: true,
        message: '회원가입 요청이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.',
        data: {
          email: authData.user?.email,
          needsEmailVerification: true,
          redirectTo: redirectTo
        }
      });
    } else {
      // 즉시 가입 완료 (개발환경 등에서 이메일 인증 비활성화된 경우)
      console.log('✅ 이메일 인증 없이 즉시 가입 완료');
      
      res.json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        data: {
          email: authData.user?.email,
          needsEmailVerification: false
        }
      });
    }

  } catch (error) {
    console.error('❌ 회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
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
            subscription: 'premium',
            usage: {
              scripts_generated: 0,
              monthly_limit: 999999
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
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin 클라이언트가 설정되지 않았습니다.');
      }
      return await supabaseAdmin
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

console.log('✅ [auth.js] 라우터 등록 완료');

module.exports = router;