import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true); // 초기 로딩 상태를 true로 설정
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
    } finally {
      setLoading(false); // 인증 확인 완료 후 로딩 상태 해제
    }
  }, [setAuthState]);

  // 로그인
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.login({ email, password });
      
      if (res.data.success && res.data.token && res.data.user) {
        await setAuthState(res.data.user, res.data.token);
        await checkAuth(); // 로그인 후 인증 상태 재확인
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
      setAuthState(null, null);
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
      toast.success('로그아웃되었습니다.');
    }
  }, [setAuthState]);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 