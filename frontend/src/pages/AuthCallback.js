import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AuthCallback = () => {
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 액세스 토큰과 리프레시 토큰 추출
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('📧 인증 콜백 처리:', { hasAccessToken: !!accessToken, type });
        
        if (!accessToken) {
          setStatus('error');
          setMessage('인증 토큰이 없습니다.');
          return;
        }

        if (type === 'signup') {
          // 백엔드 API 호출하여 회원가입 완료 처리
          const response = await fetch('/api/auth/auth/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            setStatus('success');
            setMessage('회원가입이 완료되었습니다!');
            
            toast.success('회원가입 완료! 이제 로그인할 수 있습니다.');
            
            // 3초 후 로그인 페이지로 이동
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  message: '회원가입이 완료되었습니다. 로그인해주세요.',
                  email: data.user?.email
                } 
              });
            }, 3000);
          } else {
            setStatus('error');
            setMessage(data.message || '회원가입 완료에 실패했습니다.');
          }
        } else {
          setStatus('error');
          setMessage('알 수 없는 인증 타입입니다.');
        }
      } catch (error) {
        console.error('인증 콜백 처리 오류:', error);
        setStatus('error');
        setMessage('인증 처리 중 오류가 발생했습니다.');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                <Loader className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                인증 처리 중...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                잠시만 기다려주세요.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                인증 완료!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-sm text-green-800">
                  <p className="font-medium">🎉 환영합니다!</p>
                  <p className="mt-2">
                    이메일 인증이 성공적으로 완료되었습니다.
                    <br />
                    잠시 후 로그인 페이지로 이동합니다.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="text-primary hover:text-primary-dark font-medium"
                >
                  지금 로그인하기
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                인증 실패
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-800">
                  <p className="font-medium">❌ 인증 실패</p>
                  <p className="mt-2">
                    다음 사항을 확인해주세요:
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>인증 링크가 올바른지 확인</li>
                    <li>링크가 만료되지 않았는지 확인</li>
                    <li>이미 인증된 계정인지 확인</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  다시 회원가입하기
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  로그인 페이지로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;