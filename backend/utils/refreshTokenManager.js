const { supabaseAdmin, safeQuery } = require('../config/supabase');
const { generateSecureToken, verifyRefreshToken } = require('./jwt');

// 메모리 기반 refresh token 저장소 (간단한 구현)
// 실제 프로덕션에서는 Redis나 데이터베이스 사용 권장
const refreshTokenStore = new Map();

// Refresh Token 정리 (주기적 실행)
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [token, data] of refreshTokenStore.entries()) {
    if (now > data.expiresAt) {
      refreshTokenStore.delete(token);
      console.log(`🗑️ 만료된 리프레시 토큰 삭제: ${data.userId}`);
    }
  }
};

// 1시간마다 만료된 토큰 정리
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// Refresh Token 생성 및 저장
const createRefreshToken = async (userId, email) => {
  try {
    // 기존 리프레시 토큰들 삭제 (동일 사용자)
    for (const [token, data] of refreshTokenStore.entries()) {
      if (data.userId === userId) {
        refreshTokenStore.delete(token);
      }
    }

    // 새 리프레시 토큰 생성
    const refreshToken = generateSecureToken();
    const expiresAt = Date.now() + (14 * 24 * 60 * 60 * 1000); // 14일

    // 메모리에 저장
    refreshTokenStore.set(refreshToken, {
      userId,
      email,
      expiresAt,
      createdAt: Date.now()
    });

    console.log(`✅ 리프레시 토큰 생성: ${userId}`);
    return refreshToken;

  } catch (error) {
    console.error('❌ 리프레시 토큰 생성 실패:', error);
    throw new Error('리프레시 토큰 생성에 실패했습니다.');
  }
};

// Refresh Token 검증
const verifyRefreshTokenData = (refreshToken) => {
  const tokenData = refreshTokenStore.get(refreshToken);
  
  if (!tokenData) {
    throw new Error('리프레시 토큰을 찾을 수 없습니다.');
  }

  if (Date.now() > tokenData.expiresAt) {
    refreshTokenStore.delete(refreshToken);
    throw new Error('리프레시 토큰이 만료되었습니다.');
  }

  return tokenData;
};

// Refresh Token 삭제 (로그아웃 시)
const deleteRefreshToken = (refreshToken) => {
  const deleted = refreshTokenStore.delete(refreshToken);
  if (deleted) {
    console.log('🗑️ 리프레시 토큰 삭제 완료');
  }
  return deleted;
};

// 사용자의 모든 Refresh Token 삭제
const deleteAllUserRefreshTokens = (userId) => {
  let deletedCount = 0;
  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(token);
      deletedCount++;
    }
  }
  console.log(`🗑️ 사용자 ${userId}의 리프레시 토큰 ${deletedCount}개 삭제`);
  return deletedCount;
};

// 토큰 스토어 상태 조회 (디버깅용)
const getTokenStoreInfo = () => {
  const totalTokens = refreshTokenStore.size;
  const now = Date.now();
  let validTokens = 0;
  let expiredTokens = 0;

  for (const [token, data] of refreshTokenStore.entries()) {
    if (now <= data.expiresAt) {
      validTokens++;
    } else {
      expiredTokens++;
    }
  }

  return {
    totalTokens,
    validTokens,
    expiredTokens
  };
};

module.exports = {
  createRefreshToken,
  verifyRefreshTokenData,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  cleanupExpiredTokens,
  getTokenStoreInfo
};