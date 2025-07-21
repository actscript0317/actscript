import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : 'https://actscript.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// API 요청/응답 디버깅
api.interceptors.request.use(request => {
  console.log('API Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  });
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    return Promise.reject(error);
  }
);

// 요청 인터셉터 - 토큰 처리
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 인증 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 인증 API
export const authAPI = {
  // 회원가입
  register: (data) => axios.post(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/register`, data),
  // 로그인
  login: (data) => axios.post(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/login`, data),
  // 로그아웃
  logout: () => axios.post(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/logout`),
  // 현재 사용자 정보 조회
  getMe: () => axios.get(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/me`),
  // 프로필 수정
  updateProfile: (data) => axios.put(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/profile`, data),
  // 비밀번호 변경
  changePassword: (data) => axios.put(`${process.env.REACT_APP_API_URL || API_BASE_URL}/auth/password`, data),
};

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

export default api; 