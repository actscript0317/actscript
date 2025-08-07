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
        console.log('🔗 현재 URL:', window.location.href);
        console.log('🔗 Hash:', window.location.hash);
        
        // URL Fragment에서 토큰 정보 확인
        const hash = window.location.hash;
        if (!hash || hash.length <= 1) {
          console.error('❌ Hash fragment 없음');
          setStatus('error');
          setMessage('인증 정보가 없습니다.');
          setLoading(false);
          return;
        }

        // # 제거하고 파라미터 파싱
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('token_type');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');

        console.log('📋 파싱된 토큰 정보:', {
          hasAccessToken: !!accessToken,
          tokenType,
          type,
          error,
          hasRefreshToken: !!refreshToken,
          expiresIn
        });

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

        console.log('✅ 토큰 정보 확인 완료');

        // Supabase 세션 설정
        const { data: { session }, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (setSessionError || !session) {
          console.error('❌ 세션 설정 실패:', setSessionError);
          setStatus('error');
          setMessage('세션 설정에 실패했습니다.');
          setLoading(false);
          return;
        }

        console.log('✅ 세션 설정 완료:', {
          userId: session.user.id,
          email: session.user.email,
          emailConfirmed: !!session.user.email_confirmed_at
        });

        // 사용자 메타데이터 확인
        const username = session.user.user_metadata?.username;
        const name = session.user.user_metadata?.name;

        console.log('👤 사용자 메타데이터:', { username, name });

        if (!username || !name) {
          console.error('❌ 사용자 메타데이터 부족');
          setStatus('error');
          setMessage('회원가입 정보가 불완전합니다. 다시 회원가입해주세요.');
          setLoading(false);
          return;
        }

        // 백엔드에 사용자 프로필 생성 요청
        try {
          console.log('📤 프로필 생성 요청 시작');
          
          const response = await authAPI.completeSignup({
            userId: session.user.id,
            email: session.user.email,
            username,
            name
          });

          if (response.data.success) {
            console.log('✅ 프로필 생성 완료:', response.data.user);
            
            // AuthContext에 사용자 정보 설정
            setUserAuth(response.data.user, session.access_token);

            setStatus('success');
            setMessage('이메일 인증이 완료되었습니다! 자동으로 홈페이지로 이동합니다.');

            // 브라우저 히스토리 정리 (Fragment 제거)
            window.history.replaceState({}, document.title, window.location.pathname);

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
          } else if (apiError.response?.data?.error === 'DUPLICATE_USERNAME') {
            errorMessage = '이미 사용 중인 사용자명입니다. 다른 사용자명으로 다시 회원가입해주세요.';
          }
          setMessage(errorMessage);
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
    // Fragment 정리 후 회원가입 페이지로 이동
    window.history.replaceState({}, document.title, window.location.pathname);
    navigate('/register', { replace: true });
  };

  const handleGoToLogin = () => {
    // Fragment 정리 후 로그인 페이지로 이동
    window.history.replaceState({}, document.title, window.location.pathname);
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
                  ❌ 이메일 인증에 실패했습니다.
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