import { useState, useCallback } from 'react';
import api from '../services/api';

const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 회원가입
  const register = useCallback(async (formData) => {
    setLoading(true);
    setError(null);

    try {
      // 비밀번호 확인
      if (formData.password !== formData.confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      // 요청 데이터 준비
      const { confirmPassword, ...registerData } = formData;

      console.log('📝 [회원가입 시작]', {
        ...registerData,
        password: '[HIDDEN]'
      });

      // API 요청
      const response = await api.post('/auth/register', registerData);

      console.log('✅ [회원가입 성공]', {
        userId: response.data.user?._id,
        username: response.data.user?.username
      });

      // 성공 응답
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };

    } catch (error) {
      // 에러 메시지 처리
      const errorMessage = error.response?.data?.message 
        || error.message 
        || '회원가입 중 오류가 발생했습니다.';

      console.error('❌ [회원가입 실패]', {
        message: errorMessage,
        error: error.response?.data || error
      });

      setError(errorMessage);

      return {
        success: false,
        message: errorMessage
      };

    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인 상태 확인
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return null;
    }
  }, []);

  return {
    register,
    checkAuthStatus,
    loading,
    error
  };
};

export default useAuth; 