import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUserAuth } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 이메일 인증 처리 시작');
        
        // URL Fragment에서 토큰 정보 확인
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('token_type');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        // 에러가 있는 경우
        if (error) {
          console.error('❌ 인증 에러:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || '인증 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }

        // 토큰이 없는 경우
        if (!accessToken || !tokenType) {
          console.error('❌ 토큰 정보 없음');
          setStatus('error');
          setMessage('인증 정보가 올바르지 않습니다.');
          setLoading(false);
          return;
        }

        console.log('✅ 토큰 정보 확인:', { type, hasToken: !!accessToken });

        // Supabase에서 세션 설정 (토큰 정보 기반)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // 토큰을 수동으로 설정하여 세션 생성
          const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || ''
          });

          if (setSessionError || !newSession) {
            console.error('❌ 세션 설정 실패:', setSessionError);
            setStatus('error');
            setMessage('세션 설정에 실패했습니다.');
            setLoading(false);
            return;
          }

          console.log('✅ 세션 설정 완료:', newSession.user.email);
        }

        // 현재 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('❌ 사용자 정보 조회 실패:', userError);
          setStatus('error');
          setMessage('사용자 정보를 가져올 수 없습니다.');
          setLoading(false);
          return;
        }

        console.log('✅ 사용자 정보 확인:', {
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.email_confirmed_at
        });

        // 이메일 확인 타입인 경우 사용자 프로필 생성
        if (type === 'signup' || !user.email_confirmed_at) {
          const username = user.user_metadata?.username;
          const name = user.user_metadata?.name;

          if (!username || !name) {
            console.error('❌ 사용자 메타데이터 부족:', user.user_metadata);
            setStatus('error');
            setMessage('회원가입 정보가 불완전합니다. 다시 회원가입해주세요.');
            setLoading(false);
            return;
          }

          // 백엔드에 사용자 프로필 생성 요청
          try {
            const response = await authAPI.completeSignup({
              userId: user.id,
              email: user.email,
              username,
              name
            });

            if (response.data.success) {
              console.log('✅ 사용자 프로필 생성 완료:', response.data.user);
              
              // AuthContext에 사용자 정보 설정
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (currentSession) {
                setUserAuth(response.data.user, currentSession.access_token);
              }

              setStatus('success');
              setMessage('이메일 인증이 완료되었습니다! 자동으로 로그인됩니다.');

              // 3초 후 홈페이지로 이동
              setTimeout(() => {
                navigate('/', { replace: true });
                toast.success('회원가입이 완료되었습니다!');
              }, 3000);
            } else {
              console.error('❌ 프로필 생성 실패:', response.data.message);
              setStatus('error');
              setMessage(response.data.message || '프로필 생성에 실패했습니다.');
            }
          } catch (apiError) {
            console.error('❌ API 호출 실패:', apiError);
            setStatus('error');
            
            let errorMessage = '프로필 생성 중 오류가 발생했습니다.';
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message;
            }
            setMessage(errorMessage);
          }
        } else {
          // 이미 인증된 사용자인 경우
          console.log('✅ 이미 인증된 사용자');
          setStatus('success');
          setMessage('이미 인증이 완료된 계정입니다. 로그인 페이지로 이동합니다.');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
            toast.success('로그인 페이지로 이동합니다.');
          }, 2000);
        }

      } catch (error) {
        console.error('❌ 인증 처리 중 오류:', error);
        setStatus('error');
        setMessage('인증 처리 중 예상치 못한 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    // URL에 hash가 있는 경우에만 처리
    if (window.location.hash) {
      handleAuthCallback();
    } else {
      setStatus('error');
      setMessage('인증 정보가 없습니다.');
      setLoading(false);
    }
  }, [navigate, setUserAuth]);

  const handleRetry = () => {
    navigate('/register', { replace: true });
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {loading && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                이메일 인증 처리 중...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                잠시만 기다려주세요.
              </p>
            </>
          )}

          {!loading && status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                인증 완료!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  🎉 성공적으로 이메일 인증이 완료되었습니다.
                </p>
              </div>
            </>
          )}

          {!loading && status === 'error' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                인증 실패
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  ❌ 이메일 인증에 실패했습니다. 다시 시도해주세요.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  다시 회원가입하기
                </button>
                <button
                  onClick={handleGoToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  로그인 페이지로 이동
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