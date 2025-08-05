const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const emailService = require('../utils/emailService');
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
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.')
];

// Supabase 매직링크 회원가입
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

    console.log('✅ 사용자명 중복 확인 완료');

    // Supabase Auth로 사용자 생성 (이메일 미확인 상태)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        name,
        role: 'user'
      },
      email_confirm: false // 이메일 확인 필요
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
        message: '회원가입 중 오류가 발생했습니다.',
        error: authError.message
      });
    }

    console.log('✅ Supabase Auth 사용자 생성 성공:', authData.user.id);

    // users 테이블에 추가 정보 저장
    const userData = {
      id: authData.user.id,
      username,
      email,
      name,
      role: 'user',
      is_active: true,
      is_email_verified: false,
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
      
      // Auth 사용자는 생성됐지만 프로필 생성 실패 시 Auth 사용자 삭제
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        success: false,
        message: '사용자 프로필 생성에 실패했습니다.'
      });
    }

    // 매직링크 이메일 발송
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (emailError) {
      console.error('❌ 이메일 발송 실패:', emailError);
      // 이메일 발송 실패해도 회원가입은 완료된 상태
    } else {
      console.log('✅ 매직링크 이메일 발송 성공');
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        isEmailVerified: false
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

// 이메일 인증 콜백 처리 (매직링크 클릭 시)
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    // Supabase에서 토큰 검증 및 사용자 활성화
    const { data: userData, error: verifyError } = await supabaseAdmin.auth.admin.updateUserById(
      token,
      { email_confirm: true }
    );

    if (verifyError) {
      console.error('❌ 이메일 인증 실패:', verifyError);
      return res.status(400).json({
        success: false,
        message: '이메일 인증에 실패했습니다.'
      });
    }

    // users 테이블에서 해당 사용자의 이메일 인증 상태 업데이트
    const updateResult = await safeQuery(async () => {
      return await supabase
        .from('users')
        .update({
          is_email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('id', userData.user.id)
        .select()
        .single();
    }, '이메일 인증 상태 업데이트');

    if (!updateResult.success) {
      console.error('❌ 이메일 인증 상태 업데이트 실패:', updateResult.error);
    }

    console.log('✅ 이메일 인증 완료:', userData.user.email);

    res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다! 이제 로그인할 수 있습니다.',
      user: {
        id: userData.user.id,
        email: userData.user.email,
        isEmailVerified: true
      }
    });

  } catch (error) {
    console.error('이메일 인증 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '이메일 인증 처리 중 오류가 발생했습니다.'
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

    // Supabase Auth로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('로그인 실패:', authError);
      
      let message = '로그인에 실패했습니다.';
      if (authError.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (authError.message.includes('Email not confirmed')) {
        message = '이메일 인증이 필요합니다.';
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
      return res.status(userResult.error.code).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }

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

// 이메일 확인 재발송
router.post('/resend-verification', authenticateToken, async (req, res) => {
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

// Test endpoint to verify file loading
router.get('/test-route', (req, res) => {
  res.json({ message: 'Updated supabase-auth.js is loaded!' });
});

module.exports = router;