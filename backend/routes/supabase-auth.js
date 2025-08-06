const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
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

    // 사용자명 중복 확인
    const existingUserResult = await safeQuery(async () => {
      return await supabase
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
      return res.status(404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다. 이메일 인증을 완료해주세요.'
      });
    }

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id);

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