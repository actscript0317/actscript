import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, Loader } from 'lucide-react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError('유효하지 않은 인증 링크입니다.');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const response = await authAPI.verifyEmail(token);
      
      if (response.data.success) {
        setSuccess(true);
        toast.success('이메일 인증이 완료되었습니다!');
      } else {
        setError(response.data.message || '인증에 실패했습니다.');
        toast.error(response.data.message || '인증에 실패했습니다.');
      }
    } catch (error) {
      console.error('이메일 인증 실패:', error);
      const errorMessage = error.response?.data?.message || '서버 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">이메일 인증 중...</h2>
            <p className="mt-2 text-sm text-gray-600">
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">인증 완료!</h2>
            <p className="mt-4 text-gray-600">
              이메일 인증이 성공적으로 완료되었습니다.<br />
              이제 모든 서비스를 이용하실 수 있습니다.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                계정이 활성화되었습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              홈으로 이동
            </button>
            
            <Link
              to="/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">인증 실패</h2>
          <p className="mt-4 text-gray-600">
            {error}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">가능한 원인:</h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• 인증 링크가 만료되었습니다 (10분 제한)</li>
            <li>• 이미 인증된 계정입니다</li>
            <li>• 유효하지 않은 인증 링크입니다</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <Link
            to="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            로그인 페이지로
          </Link>
          
          <Link
            to="/register"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            회원가입 페이지로
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;