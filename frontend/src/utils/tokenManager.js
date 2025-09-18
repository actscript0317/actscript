// JWT 토큰 관리 유틸리티

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const USER_KEY = 'user';

// Access Token 저장
export const setAccessToken = (token, expiresIn) => {
  localStorage.setItem(TOKEN_KEY, token);
  
  // 만료 시간 계산 (현재 시간 + expiresIn초 - 여유분 5분)
  const expiryTime = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

// Refresh Token 저장
export const setRefreshToken = (refreshToken) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

// Access Token 조회
export const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Refresh Token 조회
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// 토큰 만료 시간 조회
export const getTokenExpiry = () => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
};

// Access Token 만료 여부 확인
export const isAccessTokenExpired = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  
  return Date.now() >= expiry;
};

// 사용자 정보 저장
export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// 사용자 정보 조회
export const getUser = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

// 로그인 데이터 저장
export const setAuthData = (tokens, user) => {
  console.log('💾 인증 데이터 저장 시작:', {
    hasAccessToken: !!tokens.accessToken,
    hasRefreshToken: !!tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: user.email
  });
  
  setAccessToken(tokens.accessToken, tokens.expiresIn);
  setRefreshToken(tokens.refreshToken);
  setUser(user);
  
  // 저장 후 검증
  const savedToken = getAccessToken();
  const savedRefresh = getRefreshToken();
  const savedUser = getUser();
  
  console.log('✅ 인증 데이터 저장 완료:', {
    user: user.email,
    tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000).toLocaleString(),
    savedToken: !!savedToken,
    savedRefresh: !!savedRefresh,
    savedUser: !!savedUser
  });
};

// 인증 데이터 삭제
export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
  
  console.log('🗑️ 인증 데이터 삭제 완료');
};

// 로그인 상태 확인
export const isAuthenticated = () => {
  const token = getAccessToken();
  const user = getUser();
  return !!(token && user);
};

// 인증 상태 복원 (새로고침 시)
export const getAuthState = () => {
  const user = getUser();
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  
  console.log('🔍 토큰 상태 확인:', {
    hasUser: !!user,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    tokenExpired: isAccessTokenExpired(),
    user: user?.email
  });
  
  if (!user || !accessToken || !refreshToken) {
    console.log('❌ 인증 데이터 누락, 로그아웃 처리');
    return null;
  }
  
  return {
    user,
    accessToken,
    refreshToken,
    needsRefresh: isAccessTokenExpired()
  };
};

// 토큰 만료까지 남은 시간 (밀리초)
export const getTimeUntilExpiry = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return 0;
  
  return Math.max(0, expiry - Date.now());
};

// 토큰이 곧 만료되는지 확인 (10분 이내)
export const isTokenExpiringSoon = () => {
  const timeLeft = getTimeUntilExpiry();
  return timeLeft > 0 && timeLeft <= (10 * 60 * 1000); // 10분
};

// 디버깅용: 토큰 상태 조회
export const getTokenStatus = () => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const expiry = getTokenExpiry();
  const user = getUser();

  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasUser: !!user,
    isExpired: isAccessTokenExpired(),
    expiringSoon: isTokenExpiringSoon(),
    expiryTime: expiry ? new Date(expiry).toLocaleString() : null,
    timeUntilExpiry: getTimeUntilExpiry()
  };
};

// 토큰 갱신 타이머 ID 저장
let refreshTimeoutId = null;

// 토큰 만료 전 자동 갱신 스케줄링
export const scheduleTokenRefresh = (refreshCallback) => {
  // 기존 타이머가 있으면 제거
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }

  const timeUntilExpiry = getTimeUntilExpiry();

  // 토큰이 이미 만료되었거나 없으면 스케줄링하지 않음
  if (timeUntilExpiry <= 0) {
    console.log('⚠️ 토큰이 이미 만료됨, 갱신 스케줄링 안함');
    return;
  }

  // 만료 10분 전 또는 즉시 갱신 (남은 시간이 10분 미만인 경우)
  const refreshTime = Math.max(0, timeUntilExpiry - (10 * 60 * 1000));

  console.log('⏰ 토큰 갱신 스케줄링:', {
    timeUntilExpiry: Math.floor(timeUntilExpiry / 1000 / 60) + '분',
    refreshInMinutes: Math.floor(refreshTime / 1000 / 60) + '분 후'
  });

  refreshTimeoutId = setTimeout(async () => {
    try {
      console.log('🔄 자동 토큰 갱신 시작');
      if (refreshCallback && typeof refreshCallback === 'function') {
        await refreshCallback();
        console.log('✅ 자동 토큰 갱신 완료');

        // 갱신 후 다음 갱신 스케줄링
        scheduleTokenRefresh(refreshCallback);
      }
    } catch (error) {
      console.error('❌ 자동 토큰 갱신 실패:', error);
    }
  }, refreshTime);
};

// 토큰 갱신 스케줄링 취소
export const cancelTokenRefresh = () => {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
    console.log('🗑️ 토큰 갱신 스케줄링 취소');
  }
};