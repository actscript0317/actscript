import { useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';

const useAuth = () => {
  const [user, setUser] = useState(() => {
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
      if (!token) {
        setAuthState(null, null);
        return false;
      }

      const res = await authAPI.getMe();
      if (res.data.success && res.data.user) {
        setAuthState(res.data.user, token);
        return true;
      } else {
        setAuthState(null, null);
        return false;
      }
    } catch (error) {
      console.error('[인증 확인 실패]', error);
      setAuthState(null, null);
      return false;
    }
  }, [setAuthState]);

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

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user
  };
};

export default useAuth; 