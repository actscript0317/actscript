import { useState, useCallback, useEffect } from 'react';
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

  // 로그인 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        setAuthState(null, null);
        return false;
      }

      const res = await authAPI.getMe();
      
      if (res.data.success && res.data.user) {
        // 토큰은 유효하고 사용자 정보도 있는 경우
        setAuthState(res.data.user, token);
        return true;
      } else {
        // 토큰은 있지만 사용자 정보를 가져올 수 없는 경우
        setAuthState(null, null);
        return false;
      }
    } catch (error) {
      // API 호출 실패 (토큰 만료 등)
      console.error('[인증 확인 실패]', error);
      setAuthState(null, null);
      return false;
    }
  }, [setAuthState]);

  // 주기적으로 인증 상태 확인
  useEffect(() => {
    // 초기 인증 상태 확인
    checkAuth();

    // 5분마다 인증 상태 확인
    const interval = setInterval(checkAuth, 5 * 60 * 1000);

    // 컴포넌트 언마운트 시 인터벌 제거
    return () => clearInterval(interval);
  }, [checkAuth]);

  // 회원가입
  const register = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.register(formData);
      
      if (res.data.success && res.data.token && res.data.user) {
        setAuthState(res.data.user, res.data.token);
        return { 
          success: true,
          user: res.data.user
        };
      }

      throw new Error('회원가입 응답에 필요한 데이터가 없습니다.');
    } catch (error) {
      console.error('[회원가입 실패]', error);
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
      const res = await authAPI.login({ email, password });
      
      if (res.data.success && res.data.token && res.data.user) {
        setAuthState(res.data.user, res.data.token);
        return { 
          success: true,
          user: res.data.user
        };
      }

      throw new Error('로그인 응답에 필요한 데이터가 없습니다.');
    } catch (error) {
      console.error('[로그인 실패]', error);
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
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('[로그아웃 실패]', error);
    } finally {
      setAuthState(null, null);
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