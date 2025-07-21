import { useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const useAuth = () => {
  const [user, setUser] = useState(() => {
    // 초기 상태를 localStorage에서 가져옴
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 로그인 상태 설정
  const setAuthState = useCallback((userData, token) => {
    if (userData && token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  // 회원가입
  const register = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[회원가입 요청]', {
        ...formData,
        password: '[HIDDEN]',
        confirmPassword: '[HIDDEN]'
      });

      // 비밀번호 확인
      if (formData.password !== formData.confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      // 데이터 유효성 검사
      if (!formData.username || !formData.email || !formData.password || !formData.name) {
        throw new Error('모든 필드를 입력해주세요.');
      }

      // 이메일 형식 검사
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('올바른 이메일 형식이 아닙니다.');
      }

      // 사용자명 형식 검사 (한글, 영문, 숫자 허용, 3-20자)
      if (formData.username.length < 3 || formData.username.length > 20) {
        throw new Error('사용자명은 3-20자 사이여야 합니다.');
      }

      // 특수문자 검사 (공백, 특수문자 불허용)
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
      if (specialCharRegex.test(formData.username)) {
        throw new Error('사용자명에 특수문자를 사용할 수 없습니다.');
      }

      // 비밀번호 형식 검사 (최소 6자)
      if (formData.password.length < 6) {
        throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
      }

      // confirmPassword 제외하고 요청 보내기
      const { confirmPassword, ...registerData } = formData;
      
      const res = await authAPI.register(registerData);
      console.log('[회원가입 응답]', res.data);

      if (res.data.success && res.data.token && res.data.user) {
        setAuthState(res.data.user, res.data.token);
        return { 
          success: true,
          user: res.data.user
        };
      }

      throw new Error('회원가입 응답에 필요한 데이터가 없습니다.');

    } catch (error) {
      console.log('[회원가입 실패]', error.response?.data || error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.message ||
                          error.message ||
                          '회원가입 중 오류가 발생했습니다.';
      
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[로그인 요청]', { email, password: '[HIDDEN]' });
      
      const res = await authAPI.login({ email, password });
      console.log('[로그인 응답]', res.data);

      if (res.data.success && res.data.token && res.data.user) {
        setAuthState(res.data.user, res.data.token);
        return { 
          success: true,
          user: res.data.user
        };
      }

      throw new Error('로그인 응답에 필요한 데이터가 없습니다.');

    } catch (error) {
      console.log('[로그인 실패]', error.response?.data || error);
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      setError(errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const logout = useCallback(() => {
    setAuthState(null, null);
  }, [setAuthState]);

  // 로그인 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        setAuthState(null, null);
        return false;
      }

      // 토큰으로 현재 사용자 정보 조회
      const res = await authAPI.getMe();
      
      if (res.data.user) {
        setAuthState(res.data.user, token);
        return true;
      } else {
        setAuthState(null, null);
        return false;
      }
    } catch (error) {
      console.log('[인증 확인 실패]', error);
      setAuthState(null, null);
      return false;
    }
  }, [setAuthState]);

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    checkAuth
  };
};

export default useAuth; 