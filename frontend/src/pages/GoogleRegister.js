import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import GoogleSignup from '../components/GoogleSignup';

const GoogleRegister = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Google 회원가입 성공 핸들러
  const handleGoogleSignupSuccess = (result) => {
    toast.success('Google 회원가입이 완료되었습니다!');
    navigate('/', { replace: true });
  };

  // Google 회원가입 실패 핸들러
  const handleGoogleSignupError = (errorMessage) => {
    setError(errorMessage);
    toast.error(errorMessage);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Google 회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            Google 계정으로 간편하게 가입하세요
          </p>
          <p className="mt-2 text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary hover:text-primary-dark">
              로그인하기
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Google 회원가입 버튼 */}
        <div className="space-y-4">
          <GoogleSignup 
            onSuccess={handleGoogleSignupSuccess}
            onError={handleGoogleSignupError}
          />
        </div>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        {/* 이메일 회원가입 링크 */}
        <div className="text-center">
          <Link 
            to="/register"
            className="w-full flex justify-center py-2 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            이메일로 회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GoogleRegister;