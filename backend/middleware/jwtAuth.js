const { verifyAccessToken } = require('../utils/jwt');
const { supabaseAdmin, safeQuery } = require('../config/supabase');

// JWT Access Token 검증 미들웨어
const authenticateJWT = async (req, res, next) => {
  try {
    console.log('🔐 JWT 인증 시작:', {
      url: req.url,
      method: req.method,
      hasAuth: !!req.headers.authorization
    });
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ 토큰 누락:', {
        authHeader,
        url: req.url
      });
      return res.status(401).json({
        success: false,
        message: '액세스 토큰이 필요합니다.',
        code: 'MISSING_TOKEN'
      });
    }

    // JWT 토큰 검증
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      let message = '유효하지 않은 토큰입니다.';
      let code = 'INVALID_TOKEN';
      
      if (error.message.includes('expired')) {
        message = '토큰이 만료되었습니다.';
        code = 'TOKEN_EXPIRED';
      }
      
      return res.status(401).json({
        success: false,
        message,
        code
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
        .eq('id', decoded.userId)
        .single();
    }, 'JWT 사용자 정보 조회');

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

    // 사용자 정보를 req.user에 설정
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role || 'user',
      subscription: user.subscription,
      usage: user.usage
    };

    next();
  } catch (error) {
    console.error('JWT 토큰 인증 실패:', error);
    
    return res.status(401).json({
      success: false,
      message: '토큰 인증에 실패했습니다.',
      code: 'AUTH_FAILED'
    });
  }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// 선택적 인증 미들웨어 (토큰이 있으면 인증, 없어도 통과)
const optionalJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        
        const userResult = await safeQuery(async () => {
          return await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .single();
        }, 'JWT 선택적 인증');

        if (userResult.success && userResult.data.is_active) {
          req.user = {
            id: userResult.data.id,
            email: userResult.data.email,
            username: userResult.data.username,
            name: userResult.data.name,
            role: userResult.data.role || 'user',
            subscription: userResult.data.subscription,
            usage: userResult.data.usage
          };
        }
      } catch (error) {
        // 선택적 인증이므로 토큰 오류는 무시
        console.warn('선택적 JWT 인증 중 오류 (무시됨):', error.message);
      }
    }

    next();
  } catch (error) {
    // 선택적 인증이므로 에러가 발생해도 다음으로 진행
    console.warn('선택적 JWT 인증 중 오류 (무시됨):', error.message);
    next();
  }
};

module.exports = {
  authenticateJWT,
  requireAdmin,
  optionalJWT
};