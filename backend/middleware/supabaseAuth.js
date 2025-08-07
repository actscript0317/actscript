const { supabase, getUserFromToken, handleSupabaseError } = require('../config/supabase');

// Supabase JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '액세스 토큰이 필요합니다.'
      });
    }

    // Supabase에서 사용자 정보 추출
    const user = await getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.',
        code: 'INVALID_TOKEN'
      });
    }

    // 사용자 정보를 req.user에 설정
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('토큰 인증 실패:', error);
    
    // JWT 토큰 만료 또는 유효하지 않은 경우 구체적인 메시지 제공
    let message = '토큰 인증에 실패했습니다.';
    let code = 'AUTH_FAILED';
    
    if (error.message && error.message.includes('expired')) {
      message = '토큰이 만료되었습니다. 다시 로그인해 주세요.';
      code = 'TOKEN_EXPIRED';
    } else if (error.message && error.message.includes('invalid')) {
      message = '유효하지 않은 토큰입니다. 다시 로그인해 주세요.';
      code = 'INVALID_TOKEN';
    }
    
    return res.status(401).json({
      success: false,
      message: message,
      code: code
    });
  }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }

  next();
};

// 선택적 인증 미들웨어 (토큰이 있으면 인증, 없어도 통과)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await getUserFromToken(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'user'
        };
      }
    }

    next();
  } catch (error) {
    // 선택적 인증이므로 에러가 발생해도 다음으로 진행
    console.warn('선택적 인증 중 오류 (무시됨):', error.message);
    next();
  }
};

// 사용자 프로필 정보 가져오기 헬퍼
const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('사용자 프로필 조회 실패:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('getUserProfile 오류:', error);
    return null;
  }
};

// 사용자 권한 확인 헬퍼
const checkUserPermission = async (userId, requiredRole = 'user') => {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return false;
    }

    // 역할 계층: admin > user
    const roleHierarchy = {
      'user': 1,
      'admin': 2
    };

    const userLevel = roleHierarchy[profile.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return false;
  }
};

// 리소스 소유권 확인 미들웨어 생성 함수
const requireOwnership = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      // 관리자는 모든 리소스에 접근 가능
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[idParam];
      
      const { data, error } = await supabase
        .from(tableName)
        .select('user_id, author_id')
        .eq('id', resourceId)
        .single();

      if (error) {
        const errorInfo = handleSupabaseError(error, 'ownership check');
        return res.status(errorInfo.code).json({
          success: false,
          message: errorInfo.message
        });
      }

      // user_id 또는 author_id 필드로 소유권 확인
      const ownerId = data.user_id || data.author_id;
      
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '이 리소스에 대한 권한이 없습니다.'
        });
      }

      next();
    } catch (error) {
      console.error('소유권 확인 중 오류:', error);
      return res.status(500).json({
        success: false,
        message: '권한 확인 중 오류가 발생했습니다.'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  getUserProfile,
  checkUserPermission,
  requireOwnership
};