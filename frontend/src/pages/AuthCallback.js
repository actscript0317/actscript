import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AuthCallback = () => {
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL 쿼리 파라미터에서 결과 확인
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const email = searchParams.get('email');
        
        console.log('📧 인증 콜백 결과:', { success, error, email });
        
        if (success === 'true') {
          setStatus('success');
          setUserEmail(email || '');
          setMessage('이메일 인증이 완료되었습니다!');
          
          toast.success('회원가입 완료! 이제 로그인할 수 있습니다.', {
            duration: 4000,
            icon: '🎉'
          });
          
          // 5초 후 로그인 페이지로 이동
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: '회원가입이 완료되었습니다. 로그인해주세요.',
                email: email,
                showWelcome: true
              } 
            });
          }, 5000);
        } else if (error) {
          setStatus('error');
          switch (error) {
            case 'invalid_token':
              setMessage('인증 링크가 올바르지 않거나 만료되었습니다.');
              break;
            case 'missing_data':
              setMessage('사용자 정보가 부족합니다. 다시 회원가입을 진행해주세요.');
              break;
            case 'profile_creation_failed':
              setMessage('사용자 프로필 생성에 실패했습니다. 고객지원에 문의해주세요.');
              break;
            case 'server_error':
              setMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
              break;
            case 'access_denied':
              setMessage('접근이 거부되었습니다.');
              break;
            case 'expired':
              setMessage('인증 링크가 만료되었습니다. 다시 회원가입을 진행해주세요.');
              break;
            default:
              setMessage(`인증 처리 중 오류가 발생했습니다. (${error})`);
          }
          
          toast.error('이메일 인증에 실패했습니다.', {
            duration: 4000
          });
        } else {
          setStatus('error');
          setMessage('인증 정보를 찾을 수 없습니다.');
          toast.error('인증 정보가 올바르지 않습니다.');
        }
      } catch (error) {
        console.error('인증 콜백 처리 오류:', error);
        setStatus('error');
        setMessage('인증 처리 중 오류가 발생했습니다.');
        toast.error('예상치 못한 오류가 발생했습니다.');
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
                이메일 인증을 확인하고 있습니다.
              </p>
              <div className="mt-4">
                <div className="animate-pulse bg-gray-200 h-2 rounded-full"></div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 animate-bounce">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                회원가입 완료! 🎉
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              {userEmail && (
                <p className="mt-1 text-xs text-gray-500">
                  계정: {userEmail}
                </p>
              )}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-800">
                  <p className="font-medium flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    환영합니다!
                  </p>
                  <p className="mt-2">
                    이메일 인증이 성공적으로 완료되었습니다.
                    <br />
                    이제 모든 기능을 이용하실 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/login', { 
                    state: { 
                      email: userEmail,
                      message: '회원가입이 완료되었습니다. 로그인해주세요.'
                    }
                  })}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  로그인하기
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-gray-500">
                  5초 후 자동으로 로그인 페이지로 이동합니다...
                </p>
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
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-800">
                  <p className="font-medium">❌ 인증 실패</p>
                  <div className="mt-3">
                    <p className="font-medium mb-2">해결 방법:</p>
                    <ul className="list-disc list-inside space-y-1 text-left">
                      <li>인증 링크가 올바른지 확인</li>
                      <li>링크가 만료되지 않았는지 확인 (24시간 이내)</li>
                      <li>이미 인증된 계정인지 확인</li>
                      <li>이메일 전체 링크를 클릭했는지 확인</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  다시 회원가입하기
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  로그인 페이지로
                </button>
                <Link
                  to="/"
                  className="block text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  홈으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;