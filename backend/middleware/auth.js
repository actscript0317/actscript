const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

// JWT 토큰 검증 미들웨어
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 헤더에서 토큰 추출
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 쿠키에서 토큰 추출
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // 토큰이 없는 경우
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '이 리소스에 접근하려면 로그인이 필요합니다.'
      });
    }

    try {
      // 토큰 검증
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // 사용자 정보 조회
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '토큰에 해당하는 사용자를 찾을 수 없습니다.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: '비활성화된 계정입니다.'
        });
      }

      // 요청 객체에 사용자 정보 추가
      req.user = user;
      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 관리자 권한 확인 미들웨어
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '접근 권한이 없습니다.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} 권한으로는 이 리소스에 접근할 수 없습니다.`
      });
    }

    next();
  };
};

// 선택적 인증 미들웨어 (토큰이 있으면 사용자 정보 추가, 없어도 계속 진행)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // 토큰이 유효하지 않아도 계속 진행
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    next();
  }
}; 