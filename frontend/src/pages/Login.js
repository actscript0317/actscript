import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, CheckCircle, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 회원가입 완료 후 로그인 페이지에 온 경우 처리
  useEffect(() => {
    const state = location.state;
    if (state?.message) {
      setWelcomeMessage(state.message);
      if (state.email) {
        setFormData(prev => ({ ...prev, email: state.email }));
      }
      if (state.showWelcome && state.success) {
        // 회원가입 성공 시 특별한 환영 메시지
        toast.success(state.message, {
          duration: 8000,
          icon: '🎉',
          style: {
            background: '#10B981',
            color: 'white',
            fontWeight: 'bold'
          }
        });
        console.log('🎉 회원가입 완료된 사용자 로그인 페이지 도착:', {
          email: state.email,
          username: state.username
        });
      } else if (state.showWelcome) {
        toast.success('회원가입이 완료되었습니다! 🎉', {
          duration: 4000,
          icon: '✨'
        });
      }
      
      // state 정리 (뒤로가기 시 메시지 중복 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 인증 상태가 변경될 때 리다이렉션
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from || '/';
      console.log('로그인 성공, 리다이렉트:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(error);
      return;
    }

    try {
      console.log('로그인 시도:', { email: formData.email });
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        console.log('로그인 성공:', { user: result.user });
        toast.success('로그인되었습니다!');
        setNeedsEmailVerification(false);
        
        // 즉시 리다이렉트 시도
        const from = location.state?.from || '/';
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 100);
      } else {
        console.error('로그인 실패:', result.message);
        setError(result.message);
        
        // 이메일 인증이 필요한 경우 특별 처리
        if (result.message && result.message.includes('이메일 인증')) {
          setNeedsEmailVerification(true);
          toast.error('이메일 인증이 필요합니다.', {
            duration: 5000
          });
        } else {
          setNeedsEmailVerification(false);
          toast.error(result.message);
        }
      }
    } catch (err) {
      console.error('로그인 에러:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setNeedsEmailVerification(false);
      toast.error('로그인 중 오류가 발생했습니다.');
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    try {
      setResendLoading(true);
      
      const response = await authAPI.resendVerification({
        email: formData.email
      });

      if (response.data.success) {
        toast.success('인증 이메일이 재발송되었습니다!');
        setNeedsEmailVerification(false);
      } else {
        toast.error(response.data.message || '재발송에 실패했습니다.');
      }
    } catch (err) {
      console.error('이메일 재발송 에러:', err);
      
      let errorMessage = '재발송 중 오류가 발생했습니다.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.email) {
      setError('이메일을 입력해주세요');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('올바른 이메일 형식이 아닙니다');
      return false;
    }
    if (!formData.password) {
      setError('비밀번호를 입력해주세요');
      return false;
    }
    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return false;
    }
    return true;
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">로그인</h2>
          <p className="mt-2 text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-primary hover:text-primary-dark">
              회원가입하기
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {welcomeMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {welcomeMessage}
            </div>
          )}

          {needsEmailVerification && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              이메일 인증이 필요합니다. 인증 메일을 확인해주세요.
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="ml-2 text-yellow-600 hover:text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {resendLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 비밀번호 찾기 링크 */}
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-sm text-primary hover:text-primary-dark"
            >
              비밀번호를 잊으셨나요?
            </Link>
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
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  로그인
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login; 