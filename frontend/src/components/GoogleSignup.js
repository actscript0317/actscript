import React, { useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GoogleSignup = ({ onSuccess, onError }) => {
  const { login } = useAuth();

  useEffect(() => {
    // Google API 스크립트 로드
    const loadGoogleAPI = () => {
      if (window.google) {
        initializeGoogleSignIn();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (!window.google) return;

      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error('Google Client ID가 설정되지 않았습니다.');
        // 프로덕션에서는 일시적으로 비활성화 상태로 유지
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signup_with',
          locale: 'ko'
        }
      );
    };

    const handleGoogleResponse = async (response) => {
      try {
        const result = await authAPI.googleLogin({
          credential: response.credential
        });

        if (result.data.success) {
          const { token, user } = result.data;
          
          // 토큰과 사용자 정보 저장
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // AuthContext 업데이트
          login(user, token);
          
          // 성공 콜백 호출
          onSuccess && onSuccess(result.data);
        } else {
          onError && onError(result.data.message || 'Google 회원가입에 실패했습니다.');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Google 회원가입 중 오류가 발생했습니다.';
        onError && onError(errorMessage);
      }
    };

    loadGoogleAPI();

    // 클린업
    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [login, onSuccess, onError]);

  return (
    <div className="w-full">
      <div 
        id="google-signin-button" 
        className="w-full flex justify-center"
        style={{ minHeight: '44px' }}
      />
    </div>
  );
};

export default GoogleSignup;