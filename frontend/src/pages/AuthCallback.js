import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabase';

// API URL 동적 설정
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('actscript-frontend.onrender.com')) {
    return 'https://actscript-backend.onrender.com/api';
  } else if (hostname.includes('actscript-1.onrender.com')) {
    return 'https://actscript-1.onrender.com/api';
  } else if (hostname.includes('actpiece.com')) {
    return 'https://api.actpiece.com/api';
  }
  
  return 'http://localhost:10000/api';
};

const AuthCallback = () => {
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 프로필 수동 복구 함수
  const handleManualRecovery = async () => {
    if (!userEmail) {
      toast.error('이메일 정보가 없습니다.');
      return;
    }

    try {
      setRetryLoading(true);
      
      console.log('🔧 수동 프로필 복구 시도:', userEmail);
      
      const response = await fetch(`${getApiBaseUrl()}/auth/recover-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail
        })
      });

      const result = await response.json();
      console.log('🔧 복구 결과:', result);

      if (result.success) {
        toast.success('프로필이 성공적으로 복구되었습니다!');
        setStatus('success');
        setMessage('프로필 복구가 완료되었습니다!');
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: '프로필이 복구되었습니다. 로그인해주세요.',
              email: userEmail,
              showWelcome: true
            } 
          });
        }, 2000);
      } else {
        toast.error(`복구 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 수동 복구 실패:', error);
      toast.error(`복구 중 오류: ${error.message}`);
    } finally {
      setRetryLoading(false);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('📧 인증 콜백 시작');
        console.log('🔗 현재 URL:', window.location.href);
        console.log('🔗 Fragment:', window.location.hash);
        
        // URL Fragment에서 토큰 정보 파싱
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const tokenType = hashParams.get('token_type');
        const type = hashParams.get('type');
        const expiresIn = hashParams.get('expires_in');
        
        console.log('🎯 Fragment 파라미터:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          tokenType,
          type,
          expiresIn
        });

        // Query Parameter에서도 확인 (fallback)
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const email = searchParams.get('email');
        
        console.log('📧 Query 파라미터:', { success, error, email });
        
        // Fragment 방식의 토큰이 있는 경우 (Supabase 기본 방식)
        if (accessToken && type === 'signup') {
          try {
            // Supabase 세션 설정
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('❌ 세션 설정 실패:', sessionError);
              throw sessionError;
            }

            const user = sessionData.user;
            console.log('✅ 세션 설정 성공:', user.email);
            
            // 이메일 정보 설정 (복구 버튼에서 사용)
            setUserEmail(user.email);

            // 사용자 메타데이터에서 정보 가져오기
            const username = user.user_metadata?.username;
            const name = user.user_metadata?.name;
            
            if (!username || !name) {
              console.error('❌ 사용자 메타데이터 부족:', user.user_metadata);
              setStatus('error');
              setMessage('사용자 정보가 부족합니다. 프로필 수동 복구를 시도해보세요.');
              return;
            }

            // 백엔드에 사용자 프로필 생성 요청
            try {
              console.log('📤 백엔드에 프로필 생성 요청:', {
                userId: user.id,
                email: user.email,
                username,
                name
              });

              const response = await fetch(`${getApiBaseUrl()}/auth/complete-signup`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  username,
                  name
                })
              });

              console.log('📥 백엔드 응답 상태:', response.status, response.statusText);

              const result = await response.json();
              console.log('📥 백엔드 응답 데이터:', result);
              
              if (!response.ok) {
                console.error('❌ HTTP 오류:', response.status, result);
                
                // 프로필 생성 실패 시 사용자에게 안내
                setStatus('error');
                setMessage(`프로필 생성 실패: ${result.message || '알 수 없는 오류'}`);
                
                // 수동 프로필 생성 안내
                toast.error(`프로필 생성에 실패했습니다. 수동으로 계정을 복구해주세요. 오류: ${result.message}`, {
                  duration: 10000
                });
                return;
              }

              if (!result.success) {
                console.error('❌ 프로필 생성 실패:', result);
                setStatus('error');
                setMessage(result.message || '프로필 생성에 실패했습니다.');
                
                // 수동 프로필 생성 안내
                toast.error(`프로필 생성에 실패했습니다: ${result.message}`, {
                  duration: 10000
                });
                return;
              }

              console.log('✅ 프로필 생성 완료 - Users 테이블에 저장됨:', result);
              console.log('👤 생성된 사용자 정보:', result.user);
              toast.success('프로필이 성공적으로 생성되어 Users 테이블에 저장되었습니다!');
              
            } catch (profileError) {
              console.error('❌ 프로필 생성 요청 실패:', profileError);
              
              // 네트워크 오류 등의 경우
              setStatus('error');
              setMessage('서버와의 통신에 실패했습니다. 잠시 후 다시 시도해주세요.');
              
              toast.error(`네트워크 오류: ${profileError.message}`, {
                duration: 10000
              });
              return;
            }

            setStatus('success');
            setUserEmail(user.email);
            setMessage(`🎉 회원가입 완료! 환영합니다, ${name}님!`);
            
            toast.success(`환영합니다, ${name}님! 회원가입이 완료되어 Users 테이블에 저장되었습니다.`, {
              duration: 5000,
              icon: '🎉'
            });
            
            // 4초 후 로그인 페이지로 이동 (환영 메시지와 함께)
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  message: `환영합니다, ${name}님! 회원가입이 완료되었습니다. 로그인해주세요.`,
                  email: user.email,
                  username: username,
                  showWelcome: true,
                  success: true
                } 
              });
            }, 4000);

          } catch (authError) {
            console.error('❌ 인증 처리 실패:', authError);
            setStatus('error');
            setMessage('인증 처리 중 오류가 발생했습니다.');
            toast.error('인증 처리에 실패했습니다.');
          }
        } 
        // Query Parameter 방식 처리 (기존 백엔드 처리 방식)
        else if (success === 'true') {
          setStatus('success');
          setUserEmail(email || '');
          setMessage('이메일 인증이 완료되었습니다!');
          
          toast.success('회원가입 완료! 이제 로그인할 수 있습니다.', {
            duration: 4000,
            icon: '🎉'
          });
          
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: '회원가입이 완료되었습니다. 로그인해주세요.',
                email: email,
                showWelcome: true
              } 
            });
          }, 5000);
        } 
        // 에러 처리
        else if (error) {
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
        } 
        // 토큰도 없고 성공/에러 파라미터도 없는 경우
        else {
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
                {userEmail && (
                  <button
                    onClick={handleManualRecovery}
                    disabled={retryLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {retryLoading ? '복구 중...' : '🔧 프로필 수동 복구'}
                  </button>
                )}
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