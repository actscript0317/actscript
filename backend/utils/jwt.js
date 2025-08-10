const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-fallback-refresh-secret-key';

// Access Token 생성 (1시간)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

// Refresh Token 생성 (14일)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '14d' });
};

// Access Token 검증
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

// Refresh Token 검증
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// 토큰 페어 생성
const generateTokenPair = (userId, email) => {
  const payload = { userId, email };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1시간 (초 단위)
    refreshExpiresIn: 14 * 24 * 60 * 60 // 14일 (초 단위)
  };
};

// Refresh Token을 위한 안전한 랜덤 문자열 생성
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  generateSecureToken
};