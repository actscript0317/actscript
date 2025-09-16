import axios from 'axios';
import { 
  getAccessToken, 
  getRefreshToken, 
  setAuthData, 
  clearAuthData, 
  isAccessTokenExpired,
  getTokenStatus 
} from '../utils/tokenManager';

// API 기본 설정 - 환경에 따른 동적 URL 설정
const getApiBaseUrl = () => {
  // 운영 환경에서는 환경 변수 사용
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 배포된 도메인 기반 자동 감지
  const hostname = window.location.hostname;
  
  if (hostname.includes('actscript-frontend.onrender.com')) {
    return 'https://actscript-backend.onrender.com/api';
  } else if (hostname.includes('actscript-1.onrender.com')) {
    return 'https://actscript.onrender.com/api';
  } else if (hostname.includes('actscript.onrender.com')) {
    // actscript.onrender.com도 actscript-1로 리다이렉트
    return 'https://actscript-1.onrender.com/api';
  } else if (hostname.includes('actpiece.com')) {
    return 'https://actscript.onrender.com/api';
  }
  
  // 로컬 개발 환경
  return 'http://localhost:10000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // GPT-4o 기준 120초로 조정
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  // CORS 관련 추가 설정
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // 5xx 에러만 reject
  }
});

// 토큰 갱신 중인지 추적하는 플래그
let isRefreshing = false;
let failedQueue = [];

// 토큰 갱신 큐 처리
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 토큰 갱신 함수
const refreshToken = async () => {
  const refresh = getRefreshToken();
  
  if (!refresh) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/v2/auth/refresh`, {
      refreshToken: refresh
    });
    
    if (response.data.success) {
      const { tokens } = response.data;
      // Access Token만 업데이트 (Refresh Token은 유지)
      setAuthData({
        accessToken: tokens.accessToken,
        refreshToken: refresh,
        expiresIn: tokens.expiresIn
      }, JSON.parse(localStorage.getItem('user')));
      
      return tokens.accessToken;
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    clearAuthData();
    throw error;
  }
};

// 재시도 로직을 위한 헬퍼 함수
const withRetry = async (apiCall, retries = 3, delay = 2000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.log(`API 호출 시도 ${attempt + 1}/${retries} 실패:`, {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (attempt === retries - 1) throw error;
      
      // CORS, 네트워크 오류, 타임아웃, 5xx 서버 에러인 경우 재시도
      const shouldRetry = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ERR_NETWORK' || 
        !error.response ||
        (error.response && error.response.status >= 500) ||
        error.message.includes('CORS');
        
      if (shouldRetry) {
        console.log(`재시도 대기 중... (${delay * (attempt + 1)}ms)`);
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }
};

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // JWT Access Token 사용
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 토큰 헤더 설정:', {
          url: config.url,
          hasToken: !!token,
          tokenLength: token?.length
        });
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ 토큰 없음:', config.url);
    }

    // OPTIONS 요청에 대한 헤더 설정
    if (config.method === 'options') {
      config.headers['Access-Control-Request-Method'] = 'GET, POST, PUT, DELETE, PATCH';
      config.headers['Access-Control-Request-Headers'] = 'Content-Type, Authorization';
    }
    
    // 개발 환경에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 [API 요청] ${config.method.toUpperCase()} ${config.url}`, {
        data: config.data ? { ...config.data, password: config.data.password ? '[HIDDEN]' : undefined } : undefined,
        params: config.params,
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ [API 요청 실패]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    // 개발 환경에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [API 응답] ${response.config.method.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 에러 응답 로깅
    console.error('❌ [API 응답 실패]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: originalRequest?.url,
      code: error.code
    });

    // 401 에러이고 토큰 만료 오류인 경우 자동 갱신 시도
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 큐에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        
        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // 토큰 갱신 실패시 로그아웃 처리
        clearAuthData();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 다른 401 에러 처리
    if (error.response?.status === 401) {
      // /me 엔드포인트가 아닌 경우에만 강제 리다이렉트
      if (!originalRequest?.url?.includes('/me')) {
        clearAuthData();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// 스크립트 API
export const scriptAPI = {
  // AI 생성 스크립트 관련
  getAIScripts: () => withRetry(() => api.get('/ai-script/scripts')),
  getAIScript: (id) => withRetry(() => api.get(`/ai-script/scripts/${id}`)),
  saveAIScript: (id) => withRetry(() => api.put(`/ai-script/scripts/${id}/save`)),
  deleteAIScript: (id) => withRetry(() => api.delete(`/ai-script/scripts/${id}`)),

  // 저장된 AI 스크립트 관련 (대본함)
  getSavedAIScripts: () => withRetry(() => api.get('/ai-script/saved')),

  // 기존 스크립트 API
  getAll: async (params = {}) => {
    try {
      const response = await withRetry(() => api.get('/scripts', { params }));
      return response.data;
    } catch (error) {
      console.error('Get All Scripts Error:', error);
      throw error;
    }
  },
  getPopular: async () => {
    try {
      const response = await withRetry(() => api.get('/scripts/popular'));
      return {
        success: true,
        data: {
          scripts: response.data?.scripts || []
        }
      };
    } catch (error) {
      console.error('Get Popular Scripts Error:', error);
      return {
        success: false,
        data: {
          scripts: []
        }
      };
    }
  },
  getLatest: async () => {
    try {
      const response = await withRetry(() => api.get('/scripts/latest'));
      return {
        success: true,
        data: {
          scripts: response.data?.scripts || []
        }
      };
    } catch (error) {
      console.error('Get Latest Scripts Error:', error);
      return {
        success: false,
        data: {
          scripts: []
        }
      };
    }
  },
  getById: async (id) => {
    try {
      const response = await withRetry(() => api.get(`/scripts/${id}`));
      return response.data;
    } catch (error) {
      console.error('Get Script By Id Error:', error);
      throw error;
    }
  },
  incrementView: async (id) => {
    try {
      const response = await withRetry(() => api.patch(`/scripts/${id}/view`));
      return response.data;
    } catch (error) {
      console.error('Increment View Error:', error);
      throw error;
    }
  },
  create: async (data) => {
    try {
      const response = await withRetry(() => api.post('/scripts', data));
      return response.data;
    } catch (error) {
      console.error('Create Script Error:', error);
      throw error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await withRetry(() => api.put(`/scripts/${id}`, data));
      return response.data;
    } catch (error) {
      console.error('Update Script Error:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await withRetry(() => api.delete(`/scripts/${id}`));
      return response.data;
    } catch (error) {
      console.error('Delete Script Error:', error);
      throw error;
    }
  },
};

// 감정 API
export const emotionAPI = {
  getAll: async () => {
    try {
      const response = await withRetry(() => api.get('/emotions'));
      return {
        success: true,
        data: {
          emotions: response.data?.emotions || []
        }
      };
    } catch (error) {
      console.error('Get All Emotions Error:', error);
      return {
        success: false,
        data: {
          emotions: []
        }
      };
    }
  },
  getById: async (id) => {
    try {
      const response = await withRetry(() => api.get(`/emotions/${id}`));
      return response.data;
    } catch (error) {
      console.error('Get Emotion By Id Error:', error);
      throw error;
    }
  },
};

// 인증 API (Mailgun 인증 코드 방식)
export const authAPI = {
  // 회원가입 1단계: 인증 코드 발송
  register: (data) => withRetry(() => api.post('/v2/auth/register', data)),
  // 회원가입 2단계: 인증 코드 확인 및 회원가입 완료
  verifyCode: (data) => withRetry(() => api.post('/v2/auth/verify-code', data)),
  // 로그인
  login: (data) => withRetry(() => api.post('/v2/auth/login', data)),
  // 로그아웃
  logout: () => withRetry(() => api.post('/v2/auth/logout')),
  // 현재 사용자 정보 조회
  getMe: () => withRetry(() => api.get('/v2/auth/me')),
  // 프로필 수정
  updateProfile: (data) => withRetry(() => api.put('/v2/auth/profile', data)),
  // 비밀번호 변경
  changePassword: (data) => withRetry(() => api.put('/v2/auth/password', data)),
  // 비밀번호 재설정 요청
  forgotPassword: (data) => withRetry(() => api.post('/v2/auth/forgot-password', data)),
  // 회원탈퇴 (향후 구현 예정)
  deleteAccount: (data) => withRetry(() => api.delete('/v2/auth/delete-account', { data })),
};

// AI 스크립트 API
export const aiScriptAPI = {
  generate: (data) => api.post('/ai-script/generate', data),
  getMyScripts: () => api.get('/ai-script/my-scripts'),
  getScript: (id) => api.get(`/ai-script/${id}`),
  deleteScript: (id) => api.delete(`/ai-script/${id}`)
};

// 좋아요 API
export const likeAPI = {
  toggle: (postId, postType) => api.post('/likes/toggle', { postId, postType }),
  getStatus: (postId, postType) => api.get(`/likes/status/${postId}/${postType}`),
  getCount: (postId, postType) => api.get(`/likes/count/${postId}/${postType}`)
};

// 북마크 API
export const bookmarkAPI = {
  toggle: (postId, postType) => api.post('/bookmarks/toggle', { postId, postType }),
  getStatus: (postId, postType) => api.get(`/bookmarks/status/${postId}/${postType}`),
  getMyBookmarks: (params) => api.get('/bookmarks/my-bookmarks', { params }),
  deleteBookmark: (postId) => api.delete(`/bookmarks/${postId}`)
};

// 배우 프로필 API
export const actorProfileAPI = {
  getAll: (params) => api.get('/actor-profiles', { params }),
  getById: (id) => api.get(`/actor-profiles/${id}`),
  create: (formData) => api.post('/actor-profiles', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/actor-profiles/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/actor-profiles/${id}`),
  getMy: () => api.get('/actor-profiles/my/profiles'),
  getPopular: (params) => api.get('/actor-profiles/popular/trending', { params })
};

// 배우 모집 API
export const actorRecruitmentAPI = {
  getAll: (params) => api.get('/actor-recruitments', { params }),
  getById: (id) => api.get(`/actor-recruitments/${id}`),
  create: (formData) => api.post('/actor-recruitments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/actor-recruitments/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/actor-recruitments/${id}`),
  getMy: () => api.get('/actor-recruitments/my/recruitments'),
  getUrgent: (params) => api.get('/actor-recruitments/urgent/list', { params })
};

// 모델 모집 API
export const modelRecruitmentAPI = {
  getAll: (params) => api.get('/model-recruitments', { params }),
  getById: (id) => api.get(`/model-recruitments/${id}`),
  create: (formData) => api.post('/model-recruitments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/model-recruitments/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/model-recruitments/${id}`),
  getMy: () => api.get('/model-recruitments/my/recruitments'),
  getUrgent: (params) => api.get('/model-recruitments/urgent/list', { params })
};

// 커뮤니티 게시글 API
export const communityPostAPI = {
  getAll: (params) => api.get('/community-posts', { params }),
  getById: (id) => api.get(`/community-posts/${id}`),
  create: (formData) => api.post('/community-posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/community-posts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/community-posts/${id}`),
  getMy: () => api.get('/community-posts/my/posts'),
  getHot: (params) => api.get('/community-posts/hot/list', { params }),
  search: (params) => api.get('/community-posts/search', { params })
};

// 관리자 API
export const adminAPI = {
  // 대시보드 통계
  getDashboardStats: () => withRetry(() => api.get('/admin/dashboard/stats')),
  
  // 방문자 통계
  getVisitors: (params) => withRetry(() => api.get('/admin/visitors', { params })),
  
  // 사용자 관리
  getUsers: (params) => withRetry(() => api.get('/admin/users', { params })),
  updateUserRole: (userId, role) => withRetry(() => api.put(`/admin/users/${userId}/role`, { role })),
  updateUserStatus: (userId, isActive) => withRetry(() => api.put(`/admin/users/${userId}/status`, { isActive })),
  
  // 콘텐츠 관리
  getScripts: (params) => withRetry(() => api.get('/admin/scripts', { params })),
  
  // 시스템 정보
  getSystemInfo: () => withRetry(() => api.get('/admin/system/info'))
};

export default api; 
