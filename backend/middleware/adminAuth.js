const jwt = require('jsonwebtoken');
// const User = require('../models/User'); // MongoDB 모델 제거됨
const { supabase } = require('../config/supabase');
const config = require('../config/env');

// 관리자 권한 확인 미들웨어
const requireAdmin = async (req, res, next) => {
  try {
    let token;

    // 헤더에서 토큰 추출
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 토큰이 없는 경우
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '관리자 인증이 필요합니다.'
      });
    }

    try {
      // 토큰 검증
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // 사용자 정보 조회 (Supabase)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다.'
        });
      }

      // 관리자 권한 확인
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
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
    console.error('관리자 인증 미들웨어 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

module.exports = requireAdmin;