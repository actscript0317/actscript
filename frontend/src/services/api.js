import axios from 'axios';

// API 기본 설정 - 백엔드 서버 URL 직접 지정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:10000/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 타임아웃을 60초로 증가
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// 재시도 로직을 위한 헬퍼 함수
const withRetry = async (apiCall, retries = 2, delay = 1000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      
      // 네트워크 오류나 타임아웃인 경우 재시도
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
        console.log(`API 재시도 ${attempt + 1}/${retries}...`);
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
    // 토큰이 있으면 헤더에 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    // 에러 응답 로깅
    console.error('❌ [API 응답 실패]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      code: error.code
    });

    // 401 에러 처리 (인증 실패)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
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

// 인증 API
export const authAPI = {
  // 이메일 인증 코드 요청
  requestVerificationCode: (data) => withRetry(() => api.post('/auth/request-verification-code', data)),
  // 회원가입
  register: (data) => withRetry(() => api.post('/auth/register', data)),
  // 로그인
  login: (data) => withRetry(() => api.post('/auth/login', data)),
  // 로그아웃
  logout: () => withRetry(() => api.post('/auth/logout')),
  // 현재 사용자 정보 조회
  getMe: () => withRetry(() => api.get('/auth/me')),
  // 프로필 수정
  updateProfile: (data) => withRetry(() => api.put('/auth/profile', data)),
  // 비밀번호 변경
  changePassword: (data) => withRetry(() => api.put('/auth/password', data)),
  // 비밀번호 재설정 요청
  forgotPassword: (data) => withRetry(() => api.post('/auth/forgot-password', data)),
  // 비밀번호 재설정 실행
  resetPassword: (token, data) => withRetry(() => api.put(`/auth/reset-password/${token}`, data)),
  // 이메일 인증 요청
  sendVerification: () => withRetry(() => api.post('/auth/send-verification')),
  // 이메일 인증 확인
  verifyEmail: (token) => withRetry(() => api.get(`/auth/verify-email/${token}`)),
  // 이메일 인증 상태 확인
  getVerificationStatus: () => withRetry(() => api.get('/auth/verification-status')),
  // 회원탈퇴
  deleteAccount: (data) => withRetry(() => api.delete('/auth/delete-account', { data })),
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