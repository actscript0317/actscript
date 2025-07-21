import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api'
  : 'https://actscript.onrender.com/api'; // 실제 백엔드 도메인

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
  register: async (data) => {
    try {
      const response = await api.post('/auth/register', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response;
    } catch (error) {
      console.error('Register Error:', error);
      throw error;
    }
  },
  
  // 로그인
  login: async (data) => {
    try {
      const response = await api.post('/auth/login', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },
  
  // 로그아웃
  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout Error:', error);
      // 로컬 스토리지는 항상 클리어
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  },
  
  // 현재 사용자 정보 조회
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      console.error('GetMe Error:', error);
      throw error;
    }
  },
  
  // 프로필 수정
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response;
    } catch (error) {
      console.error('Update Profile Error:', error);
      throw error;
    }
  },
  
  // 비밀번호 변경
  changePassword: async (data) => {
    try {
      const response = await api.put('/auth/password', data);
      return response;
    } catch (error) {
      console.error('Change Password Error:', error);
      throw error;
    }
  },
};

// 대본 API
export const scriptAPI = {
  // 모든 대본 조회
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/scripts', { params });
      return response.data;  // 응답에서 data 객체만 반환
    } catch (error) {
      console.error('Get All Scripts Error:', error);
      throw error;
    }
  },
  
  // 인기 대본 조회
  getPopular: async () => {
    try {
      const response = await api.get('/scripts/popular');
      return response.data;  // 응답에서 data 객체만 반환
    } catch (error) {
      console.error('Get Popular Scripts Error:', error);
      throw error;
    }
  },
  
  // 최신 대본 조회
  getLatest: async () => {
    try {
      const response = await api.get('/scripts/latest');
      return response.data;  // 응답에서 data 객체만 반환
    } catch (error) {
      console.error('Get Latest Scripts Error:', error);
      throw error;
    }
  },
  
  // 특정 대본 조회
  getById: async (id) => {
    try {
      const response = await api.get(`/scripts/${id}`);
      return response.data;  // 응답에서 data 객체만 반환
    } catch (error) {
      console.error('Get Script By Id Error:', error);
      throw error;
    }
  },
  
  // 조회수 증가
  incrementView: async (id) => {
    try {
      const response = await api.patch(`/scripts/${id}/view`);
      return response.data;
    } catch (error) {
      console.error('Increment View Error:', error);
      throw error;
    }
  },
  
  // 대본 생성
  create: async (data) => {
    try {
      const response = await api.post('/scripts', data);
      return response.data;
    } catch (error) {
      console.error('Create Script Error:', error);
      throw error;
    }
  },
  
  // 대본 수정
  update: async (id, data) => {
    try {
      const response = await api.put(`/scripts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Script Error:', error);
      throw error;
    }
  },
  
  // 대본 삭제
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
  // 모든 감정 조회
  getAll: async () => {
    try {
      const response = await api.get('/emotions');
      return response.data;
    } catch (error) {
      console.error('Get All Emotions Error:', error);
      throw error;
    }
  },
  
  // 특정 감정 조회
  getById: async (id) => {
    try {
      const response = await api.get(`/emotions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get Emotion By Id Error:', error);
      throw error;
    }
  },
  
  // 감정 생성
  create: async (data) => {
    try {
      const response = await api.post('/emotions', data);
      return response.data;
    } catch (error) {
      console.error('Create Emotion Error:', error);
      throw error;
    }
  },
  
  // 감정 수정
  update: async (id, data) => {
    try {
      const response = await api.put(`/emotions/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Emotion Error:', error);
      throw error;
    }
  },
  
  // 감정 삭제
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