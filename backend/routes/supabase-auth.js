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
    .matches(/^[a-zA-Z0-9_가-힣]+$/).withMessage('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('이름은 1-50자 사이여야 합니다.')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.')
];

// Supabase 매직링크 회원가입 - 1단계: 임시 저장 및 이메일 발송
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

    // 이미 등록된 이메일인지 확인 (Auth 테이블 확인)
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!getUserError && existingUser?.users) {
        const userExists = existingUser.users.find(user => user.email === email);
        
        if (userExists) {
          console.log('❌ 이메일 중복:', email);
          return res.status(400).json({
            success: false,
            message: '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
            error: 'DUPLICATE_EMAIL'
          });
        }
      }
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

    // 임시 사용자 데이터를 메모리에 저장
    if (!global.tempUsers) {
      global.tempUsers = new Map();
    }
    
    const tempUserData = {
      email,
      password,
      username,
      name,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30분 후 만료
    };
    
    global.tempUsers.set(email, tempUserData);
    console.log('✅ 임시 사용자 데이터 저장:', email);

    // 매직링크 방식으로 이메일 발송 시도
    let emailSent = false;
    let magicLink = null;
    
    try {
      // 방법 1: signInWithOtp 사용 (가장 확실한 이메일 발송)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback`,
          data: {
            username,
            name,
            role: 'user',
            type: 'signup'
          }
        }
      });

      if (!otpError) {
        emailSent = true;
        console.log('✅ OTP 매직링크 이메일 발송 성공:', email);
      } else {
        console.error('❌ OTP 발송 실패:', otpError.message);
        
        // 방법 2: Admin generateLink 사용
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback`,
            data: {
              username,
              name,
              role: 'user',
              type: 'signup'
            }
          }
        });

        if (!linkError && linkData?.properties?.action_link) {
          magicLink = linkData.properties.action_link;
          emailSent = true;
          console.log('✅ Admin 매직링크 생성 성공:', email);
          console.log('📧 매직링크:', magicLink);
        } else {
          console.error('❌ Admin 링크 생성도 실패:', linkError?.message);
        }
      }
    } catch (emailErr) {
      console.error('❌ 이메일 발송 중 예외:', emailErr.message);
    }

    if (!emailSent) {
      return res.status(400).json({
        success: false,
        message: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    res.status(200).json({
      success: true,
      message: '인증 이메일이 발송되었습니다. 이메일을 확인하여 회원가입을 완료해주세요.',
      data: {
        email: email,
        expires_in: 1800, // 30분
        ...(magicLink ? { 
          devMagicLink: magicLink,
          devMessage: '매직링크가 생성되었습니다. 이메일이 오지 않으면 이 링크를 사용하세요.' 
        } : {})
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

// 이메일 인증 콜백 처리 - 2단계: 매직링크 클릭 시 실제 사용자 생성
router.post('/auth/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    // 토큰으로 사용자 정보 가져오기
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(access_token);
    
    if (getUserError || !user) {
      console.error('❌ 사용자 정보 조회 실패:', getUserError);
      return res.status(400).json({
        success: false,
        message: '인증에 실패했습니다.'
      });
    }

    console.log('✅ 이메일 인증 완료:', user.email);
    
    // 임시 데이터에서 사용자 정보 가져오기 (옵셔널)
    let username = user.user_metadata?.username;
    let name = user.user_metadata?.name;
    
    if (!username || !name) {
      // 메모리에서 임시 데이터 조회
      if (global.tempUsers && global.tempUsers.has(user.email)) {
        const tempData = global.tempUsers.get(user.email);
        username = username || tempData.username;
        name = name || tempData.name;
        
        // 사용 후 삭제
        global.tempUsers.delete(user.email);
      }
    }
    
    if (!username || !name) {
      return res.status(400).json({
        success: false,
        message: '사용자 정보가 부족합니다. 다시 회원가입을 진행해주세요.'
      });
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
      email_verified_at: new Date().toISOString(),
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

    console.log('✅ 회원가입 완료:', {
      id: userResult.data.id,
      username: userResult.data.username,
      email: userResult.data.email
    });

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다! 이제 로그인할 수 있습니다.',
      user: {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        name: userResult.data.name,
        isEmailVerified: true
      }
    });

  } catch (error) {
    console.error('이메일 인증 콜백 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 완료 중 오류가 발생했습니다.'
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