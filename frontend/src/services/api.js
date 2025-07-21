import axios from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:10000/api'
    : 'https://actscript.onrender.com/api');

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 포함
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 토큰이 있으면 헤더에 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`🚀 [API 요청] ${config.method.toUpperCase()} ${config.url}`, {
      data: config.data ? { ...config.data, password: config.data.password ? '[HIDDEN]' : undefined } : undefined,
      params: config.params,
    });
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
    console.log(`✅ [API 응답] ${response.config.method.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('❌ [API 응답 실패]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // 401 에러 처리 (인증 실패)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// 대본 API
export const scriptAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/scripts', { params });
      return response.data;
    } catch (error) {
      console.error('Get All Scripts Error:', error);
      throw error;
    }
  },
  getPopular: async () => {
    try {
      const response = await api.get('/scripts/popular');
      return response.data;
    } catch (error) {
      console.error('Get Popular Scripts Error:', error);
      throw error;
    }
  },
  getLatest: async () => {
    try {
      const response = await api.get('/scripts/latest');
      return response.data;
    } catch (error) {
      console.error('Get Latest Scripts Error:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/scripts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get Script By Id Error:', error);
      throw error;
    }
  },
  incrementView: async (id) => {
    try {
      const response = await api.patch(`/scripts/${id}/view`);
      return response.data;
    } catch (error) {
      console.error('Increment View Error:', error);
      throw error;
    }
  },
  create: async (data) => {
    try {
      const response = await api.post('/scripts', data);
      return response.data;
    } catch (error) {
      console.error('Create Script Error:', error);
      throw error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/scripts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Script Error:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/scripts/${id}`);
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
      const response = await api.get('/emotions');
      return response.data;
    } catch (error) {
      console.error('Get All Emotions Error:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/emotions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get Emotion By Id Error:', error);
      throw error;
    }
  },
  create: async (data) => {
    try {
      const response = await api.post('/emotions', data);
      return response.data;
    } catch (error) {
      console.error('Create Emotion Error:', error);
      throw error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/emotions/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Emotion Error:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/emotions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete Emotion Error:', error);
      throw error;
    }
  },
};

// 인증 API
export const authAPI = {
  // 회원가입
  register: (data) => api.post('/auth/register', data),
  // 로그인
  login: (data) => api.post('/auth/login', data),
  // 로그아웃
  logout: () => api.post('/auth/logout'),
  // 현재 사용자 정보 조회
  getMe: () => api.get('/auth/me'),
  // 프로필 수정
  updateProfile: (data) => api.put('/auth/profile', data),
  // 비밀번호 변경
  changePassword: (data) => api.put('/auth/password', data),
};

export default api; 