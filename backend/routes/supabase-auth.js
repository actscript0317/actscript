const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const router = express.Router();

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

// Supabase 이메일 인증 회원가입
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
    console.log('✅ 입력 검증 통과, 중복 확인 시작...');

    // 이메일 중복 확인 - Admin API 사용
    try {
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError && existingUsers?.users) {
        const userExists = existingUsers.users.find(user => user.email === email);
        
        if (userExists && userExists.email_confirmed_at) {
          console.log('❌ 이미 인증된 이메일:', email);
          return res.status(400).json({
            success: false,
            message: '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
            error: 'DUPLICATE_EMAIL'
          });
        }
        
        // 인증되지 않은 기존 사용자가 있다면 삭제 후 새로 생성
        if (userExists && !userExists.email_confirmed_at) {
          console.log('🔄 인증되지 않은 기존 사용자 삭제:', email);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
        }
      }
      
      console.log('✅ 이메일 중복 확인 완료 - 사용 가능');
    } catch (emailCheckError) {
      console.warn('⚠️ 이메일 중복 확인 실패, 계속 진행:', emailCheckError.message);
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
        message: '이미 사용 중인 사용자명입니다. 다른 사용자명을 사용해주세요.',
        error: 'DUPLICATE_USERNAME'
      });
    }

    console.log('✅ 중복 확인 완료');

    // 올바른 CLIENT_URL 설정 확인 - 백엔드 콜백 방식 사용
    const serverUrl = process.env.SERVER_URL || 'https://actscript.onrender.com';
    const callbackUrl = `${serverUrl}/api/auth/callback`;
    
    console.log('🔗 리다이렉트 URL 설정:', callbackUrl);

    // Supabase Auth를 사용한 사용자 생성 및 이메일 발송
    console.log('📧 Supabase 회원가입 및 이메일 발송 시작...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
        username,
        name,
        role: 'user'
      },
        emailRedirectTo: callbackUrl
      }
    });

    if (signUpError) {
      console.error('❌ 회원가입 실패:', signUpError.message);
      
      if (signUpError.message.includes('already registered') || 
          signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already been registered')) {
        return res.status(400).json({
          success: false,
          message: '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
          error: 'DUPLICATE_EMAIL'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: '회원가입 중 오류가 발생했습니다.',
        error: signUpError.message
      });
    }

    console.log('✅ 회원가입 성공 - 이메일 발송됨:', email, '- ID:', signUpData.user?.id);
    console.log('📧 콜백 URL:', callbackUrl);

    res.status(200).json({
      success: true,
      message: '인증 이메일이 발송되었습니다. 이메일을 확인하여 회원가입을 완료해주세요.',
      data: {
        email: email,
        userId: signUpData.user?.id,
        needsEmailVerification: true,
        callbackUrl: callbackUrl
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

// 이메일 인증 완료 후 처리 (백엔드 콜백 방식)
router.get('/callback', async (req, res) => {
  try {
    // 이메일 링크에서 온 요청을 처리 (token_hash 방식과 access_token 방식 둘 다 지원)
    const { token_hash, type, access_token, refresh_token, error: authError, token_type, expires_in } = req.query;
    
    console.log('📧 이메일 인증 콜백 처리 (백엔드 방식):', { 
      type, 
      hasTokenHash: !!token_hash, 
      hasAccessToken: !!access_token,
      authError 
    });
    console.log('🔗 현재 요청 URL:', req.originalUrl);
    console.log('🌐 요청 헤더 host:', req.headers.host);
    
    const clientUrl = process.env.CLIENT_URL || 'https://actscript-1.onrender.com';
    console.log('🎯 설정된 CLIENT_URL:', clientUrl);
    
    // 프론트엔드에서 Fragment 방식으로 처리하도록 리다이렉트
    // Fragment가 있는 경우 그대로 프론트엔드로 전달
    if (req.originalUrl.includes('#')) {
      console.log('🔄 Fragment 방식 감지, 프론트엔드로 리다이렉트');
      return res.redirect(`${clientUrl}/auth/callback${req.originalUrl.substring(req.originalUrl.indexOf('#'))}`);
    }
    
    if (authError) {
      console.error('❌ 인증 오류:', authError);
      return res.redirect(`${clientUrl}/auth/callback?error=${authError}`);
    }
    
    // access_token 방식 처리 (프론트엔드에서 리다이렉트된 경우)
    if (type === 'signup' && access_token && !token_hash) {
      console.log('🔄 Access Token 방식으로 사용자 정보 처리');
      
      try {
        // access_token을 사용하여 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);
        
        if (userError || !user) {
          console.error('❌ Access Token으로 사용자 정보 가져오기 실패:', userError);
          return res.redirect(`${clientUrl}/auth/callback?error=invalid_token`);
        }
        
        console.log('✅ Access Token으로 사용자 정보 획득:', user.email);
        
        // 사용자 메타데이터에서 정보 가져오기
        const username = user.user_metadata?.username;
        const name = user.user_metadata?.name;
        
        if (!username || !name) {
          console.error('❌ 사용자 메타데이터 부족:', user.user_metadata);
          return res.redirect(`${clientUrl}/auth/callback?error=missing_data`);
        }

        // users 테이블에 사용자 정보 저장
        const userData = {
          id: user.id,
          username,
          email: user.email,
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
          return res.redirect(`${clientUrl}/auth/callback?error=profile_creation_failed`);
        }

        console.log('✅ 회원가입 완료 (Access Token 방식):', {
          id: userResult.data.id,
          username: userResult.data.username,
          email: userResult.data.email
        });

        // 성공적으로 로그인 페이지로 리다이렉트
        return res.redirect(`${clientUrl}/login?signup=success&email=${encodeURIComponent(user.email)}&message=${encodeURIComponent('회원가입이 완료되었습니다. 로그인해주세요.')}`);
        
      } catch (error) {
        console.error('❌ Access Token 처리 중 오류:', error);
        return res.redirect(`${clientUrl}/auth/callback?error=server_error`);
      }
    }
    
    // token_hash 방식 처리 (기존 이메일 링크 방식)
    if (type === 'signup' && token_hash) {
      // Supabase에서 토큰 검증
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email'
      });
      
      if (error) {
        console.error('❌ 토큰 검증 실패:', error);
        return res.redirect(`${clientUrl}/auth/callback?error=invalid_token`);
      }
      
      const user = data.user;
      console.log('✅ 이메일 인증 완료 (백엔드 방식):', user.email);
      
      // 사용자 메타데이터에서 정보 가져오기
      const username = user.user_metadata?.username;
      const name = user.user_metadata?.name;
      
      if (!username || !name) {
        console.error('❌ 사용자 메타데이터 부족:', user.user_metadata);
        return res.redirect(`${clientUrl}/auth/callback?error=missing_data`);
      }

      // users 테이블에 사용자 정보 저장
      const userData = {
        id: user.id,
        username,
        email: user.email,
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
        return res.redirect(`${clientUrl}/auth/callback?error=profile_creation_failed`);
      }

      console.log('✅ 회원가입 완료 (백엔드 방식):', {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email
      });

      // 성공적으로 로그인 페이지로 리다이렉트
      return res.redirect(`${clientUrl}/login?signup=success&email=${encodeURIComponent(user.email)}&message=${encodeURIComponent('회원가입이 완료되었습니다. 로그인해주세요.')}`);
    }
    
    console.log('❌ 알 수 없는 콜백 요청:', { type, hasToken: !!token_hash });
    res.redirect(`${clientUrl}/auth/callback?error=unknown`);

  } catch (error) {
    console.error('이메일 인증 콜백 처리 오류:', error);
    const clientUrl = process.env.CLIENT_URL || 'https://actscript-1.onrender.com';
    res.redirect(`${clientUrl}/auth/callback?error=server_error`);
  }
});

// 회원가입 완료 처리 (프론트엔드에서 Fragment 토큰 처리 후 호출)
router.post('/complete-signup', async (req, res) => {
  try {
    const { userId, email, username, name } = req.body;
    
    console.log('📝 회원가입 완료 처리:', { userId, email, username, name });
    console.log('🔧 환경변수 확인:', {
      SUPABASE_URL: process.env.SUPABASE_URL ? '설정됨' : '미설정',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '미설정',
      SERVICE_KEY_PREFIX: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'N/A',
      SUPABASE_ADMIN_EXISTS: !!supabaseAdmin
    });
    
    if (!userId || !email || !username || !name) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.'
      });
    }

    // Authorization 헤더에서 토큰 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔧 토큰 검증 시작:', token.substring(0, 20) + '...');
    
    if (!supabaseAdmin) {
      console.error('❌ supabaseAdmin이 초기화되지 않음');
      return res.status(500).json({
        success: false,
        message: 'Supabase 서비스 설정 오류가 발생했습니다.'
      });
    }
    
    // Supabase Admin을 통해 토큰 검증
    let user;
    try {
      const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
      user = data?.user;
      console.log('🔧 토큰 검증 결과:', { user: user ? '존재' : '없음', error: userError ? userError.message : '없음' });
      
      if (userError || !user) {
        console.error('❌ 토큰 검증 실패:', userError);
        return res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다.',
          debug: userError ? userError.message : 'No user found'
        });
      }
    } catch (tokenError) {
      console.error('❌ 토큰 검증 중 예외:', tokenError);
      return res.status(401).json({
        success: false,
        message: '토큰 검증 중 오류가 발생했습니다.',
        debug: tokenError.message
      });
    }
    
    if (user.id !== userId || user.email !== email) {
      console.error('❌ 사용자 정보 불일치:', { 
        tokenUserId: user.id, 
        bodyUserId: userId,
        tokenEmail: user.email,
        bodyEmail: email
      });
      return res.status(400).json({
        success: false,
        message: '사용자 정보가 일치하지 않습니다.'
      });
    }

    console.log('✅ 토큰 검증 완료:', user.email);

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
        message: '이미 사용 중인 사용자명입니다. 다른 사용자명을 사용해주세요.',
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

    console.log('📝 생성할 사용자 데이터:', userData);
    
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

    console.log('📝 사용자 프로필 생성 결과:', { success: userResult.success, error: userResult.error });

    if (!userResult.success) {
      console.error('❌ 사용자 프로필 생성 실패:', userResult.error);
      console.error('❌ 실패한 데이터:', userData);
      return res.status(500).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.',
        debug: {
          error: userResult.error,
          userData: userData
        }
      });
    }

    console.log('✅ 회원가입 완료:', {
      id: userResult.data.id,
      username: userResult.data.username,
      email: userResult.data.email
    });

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
    console.error('❌ 오류 스택:', error.stack);
    console.error('❌ 오류 메시지:', error.message);
    res.status(500).json({
      success: false,
      message: '회원가입 완료 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      console.error('❌ Supabase 로그인 실패:', {
        email,
        error: authError.message,
        code: authError.status
      });
      
      let message = '로그인에 실패했습니다.';
      if (authError.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (authError.message.includes('Email not confirmed')) {
        message = '이메일 인증이 필요합니다.';
      } else if (authError.message.includes('Email not found')) {
        message = '등록되지 않은 이메일입니다.';
      }
      
      return res.status(401).json({
        success: false,
        message,
        debug: {
          originalError: authError.message,
          errorCode: authError.status
        }
      });
    }

    console.log('✅ Supabase 로그인 성공:', {
      userId: authData.user.id,
      email: authData.user.email,
      emailVerified: authData.user.email_confirmed_at ? true : false
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
      console.error('❌ 사용자 프로필 조회 실패:', {
        userId: authData.user.id,
        email: authData.user.email,
        error: userResult.error
      });
      
      return res.status(404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다. 회원가입이 완료되지 않았을 수 있습니다.',
        debug: {
          userId: authData.user.id,
          profileError: userResult.error
        }
      });
    }

    console.log('✅ 사용자 프로필 조회 성공:', {
      id: userResult.data.id,
      username: userResult.data.username,
      isEmailVerified: userResult.data.is_email_verified
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
    console.error('❌ 로그인 처리 중 예외 발생:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      debug: {
        error: error.message
      }
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

// 이메일 확인 재발송 - 로그인하지 않은 사용자도 이용 가능
router.post('/resend-verification', [
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
    console.log('📧 이메일 인증 재발송 요청:', email);

    // 해당 이메일의 사용자가 존재하는지 확인
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ 사용자 목록 조회 실패:', listError);
      return res.status(500).json({
        success: false,
        message: '사용자 확인 중 오류가 발생했습니다.'
      });
    }

    const user = existingUsers.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.'
      });
    }

    if (user.email_confirmed_at) {
      return res.status(400).json({
        success: false,
        message: '이미 이메일 인증이 완료된 계정입니다.'
      });
    }

    // 올바른 CLIENT_URL 설정 - 백엔드 콜백 방식 사용
    const serverUrl = process.env.SERVER_URL || 'https://actscript.onrender.com';
    const callbackUrl = `${serverUrl}/api/auth/callback`;
    
    console.log('🔗 재발송 리다이렉트 URL:', callbackUrl);

    // Admin API를 사용하여 인증 링크 재발송
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: callbackUrl
      }
    });

    if (error) {
      console.error('❌ 이메일 확인 재발송 실패:', error);
      return res.status(400).json({
        success: false,
        message: '이메일 인증 재발송에 실패했습니다.'
      });
    }

    console.log('✅ 이메일 인증 재발송 성공:', email);

    res.json({
      success: true,
      message: '인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.',
      data: {
        callbackUrl: callbackUrl
      }
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

// 사용자 정보 디버깅 엔드포인트
router.get('/debug/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 사용자 정보 디버깅:', email);
    
    // 1. Supabase Auth에서 사용자 확인
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth 사용자 목록 조회 실패:', authError);
      return res.status(500).json({
        success: false,
        message: 'Auth 사용자 목록 조회 실패',
        error: authError
      });
    }
    
    const authUser = authUsers.users.find(u => u.email === email);
    
    // 2. users 테이블에서 프로필 확인
    const profileResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    }, '사용자 프로필 조회');
    
    const debugInfo = {
      email,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        emailConfirmed: !!authUser.email_confirmed_at,
        emailConfirmedAt: authUser.email_confirmed_at,
        createdAt: authUser.created_at,
        userMetadata: authUser.user_metadata
      } : null,
      profileUser: profileResult.success ? profileResult.data : null,
      profileError: profileResult.success ? null : profileResult.error
    };
    
    console.log('🔍 디버깅 결과:', debugInfo);
    
    res.json({
      success: true,
      data: debugInfo
    });
    
  } catch (error) {
    console.error('❌ 디버깅 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '디버깅 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 누락된 사용자 프로필 복구 엔드포인트
router.post('/recover-profile', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일이 필요합니다.'
      });
    }
    
    console.log('🔧 사용자 프로필 복구 시작:', email);
    
    // 1. Supabase Auth에서 사용자 확인
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth 사용자 목록 조회 실패:', authError);
      return res.status(500).json({
        success: false,
        message: 'Auth 사용자 목록 조회 실패'
      });
    }
    
    const authUser = authUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: '해당 이메일의 사용자를 찾을 수 없습니다.'
      });
    }
    
    if (!authUser.email_confirmed_at) {
      return res.status(400).json({
        success: false,
        message: '이메일 인증이 완료되지 않은 사용자입니다.'
      });
    }
    
    console.log('✅ Auth 사용자 확인 완료:', {
      id: authUser.id,
      email: authUser.email,
      emailConfirmed: !!authUser.email_confirmed_at
    });
    
    // 2. 이미 프로필이 있는지 확인
    const existingProfile = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
    }, '기존 프로필 확인');
    
    if (existingProfile.success) {
      return res.status(400).json({
        success: false,
        message: '이미 프로필이 존재합니다.',
        data: existingProfile.data
      });
    }
    
    // 3. 사용자 메타데이터에서 정보 가져오기
    const username = authUser.user_metadata?.username;
    const name = authUser.user_metadata?.name;
    
    if (!username || !name) {
      console.error('❌ 사용자 메타데이터 부족:', authUser.user_metadata);
      return res.status(400).json({
        success: false,
        message: '사용자 메타데이터가 부족합니다. 다시 회원가입을 진행해주세요.',
        debug: {
          userMetadata: authUser.user_metadata
        }
      });
    }
    
    // 4. users 테이블에 프로필 생성
    const userData = {
      id: authUser.id,
      username,
      email: authUser.email,
      name,
      role: 'user',
      is_active: true,
      is_email_verified: true,
      created_at: authUser.created_at
    };
    
    const profileResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
    }, '사용자 프로필 생성');
    
    if (!profileResult.success) {
      console.error('❌ 프로필 생성 실패:', profileResult.error);
      return res.status(500).json({
        success: false,
        message: '프로필 생성에 실패했습니다.',
        error: profileResult.error
      });
    }
    
    console.log('✅ 프로필 복구 완료:', {
      id: profileResult.data.id,
      username: profileResult.data.username,
      email: profileResult.data.email
    });
    
    res.json({
      success: true,
      message: '사용자 프로필이 성공적으로 복구되었습니다.',
      data: {
        id: profileResult.data.id,
        username: profileResult.data.username,
        email: profileResult.data.email,
        name: profileResult.data.name,
        role: profileResult.data.role,
        isEmailVerified: profileResult.data.is_email_verified
      }
    });
    
  } catch (error) {
    console.error('❌ 프로필 복구 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 복구 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// Test endpoint to verify file loading
router.get('/test-route', (req, res) => {
  res.json({ message: 'Updated supabase-auth.js is loaded!' });
});

module.exports = router;