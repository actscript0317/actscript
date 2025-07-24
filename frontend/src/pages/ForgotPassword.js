import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.forgotPassword({ email });
      
      if (response.data.success) {
        setSent(true);
        toast.success('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
      } else {
        toast.error(response.data.message || '요청 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 실패:', error);
      const errorMessage = error.response?.data?.message || '서버 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">이메일 전송 완료</h2>
            <p className="mt-4 text-gray-600">
              <strong>{email}</strong>로<br />
              비밀번호 재설정 링크를 전송했습니다.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">다음 단계:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. 이메일 확인 (스팸 폴더도 확인해주세요)</li>
              <li>2. '비밀번호 재설정하기' 버튼 클릭</li>
              <li>3. 새 비밀번호 입력</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ 재설정 링크는 <strong>10분 후</strong>에 만료됩니다.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              다른 이메일로 재전송
            </button>
            
            <Link
              to="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              로그인 페이지로 돌아가기
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
          <Link 
            to="/login"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            로그인으로 돌아가기
          </Link>
          
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">비밀번호 찾기</h2>
          <p className="mt-2 text-sm text-gray-600">
            가입하신 이메일 주소를 입력하시면<br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  전송 중...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  재설정 링크 전송
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-primary hover:text-primary-dark">
              회원가입하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;