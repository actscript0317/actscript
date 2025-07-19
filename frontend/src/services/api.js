import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://actscript.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 타임아웃 증가
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 전송을 위해 필요
});

// API 요청/응답 디버깅
if (process.env.NODE_ENV !== 'production') {
  api.interceptors.request.use(request => {
    console.log('Starting Request:', request);
    return request;
  });

  api.interceptors.response.use(response => {
    console.log('Response:', response);
    return response;
  });
}

// 요청 인터셉터 - 모든 요청에 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 오류 시 토큰 제거 및 로그아웃 처리
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // 401 오류 시 토큰 제거
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 로그인 페이지로 리다이렉트 (선택사항)
      // window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

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

// 대본 API
export const scriptAPI = {
  // 모든 대본 조회
  getAll: (params = {}) => api.get('/scripts', { params }),
  
  // 인기 대본 조회
  getPopular: () => api.get('/scripts/popular'),
  
  // 최신 대본 조회
  getLatest: () => api.get('/scripts/latest'),
  
  // 특정 대본 조회
  getById: (id) => api.get(`/scripts/${id}`),
  
  // 조회수 증가
  incrementView: (id) => api.patch(`/scripts/${id}/view`),
  
  // 대본 생성
  create: (data) => api.post('/scripts', data),
  
  // 대본 수정
  update: (id, data) => api.put(`/scripts/${id}`, data),
  
  // 대본 삭제
  delete: (id) => api.delete(`/scripts/${id}`),
};

// 감정 API
export const emotionAPI = {
  // 모든 감정 조회
  getAll: () => api.get('/emotions'),
  
  // 특정 감정 조회
  getById: (id) => api.get(`/emotions/${id}`),
  
  // 감정 생성
  create: (data) => api.post('/emotions', data),
  
  // 감정 수정
  update: (id, data) => api.put(`/emotions/${id}`, data),
  
  // 감정 삭제
  delete: (id) => api.delete(`/emotions/${id}`),
};

export default api; 