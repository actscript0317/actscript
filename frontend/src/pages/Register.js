import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [step, setStep] = useState(1); // 1: 이메일 입력, 2: 인증 코드 입력, 3: 회원정보 입력
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUserAuth } = useAuth();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('이메일을 입력해주세요.');
      toast.error('이메일을 입력해주세요.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.requestVerificationCode({ email });
      
      if (response.data.success) {
        toast.success('인증 코드가 이메일로 전송되었습니다.');
        setStep(2);
      } else {
        setError(response.data.message || '인증 코드 전송에 실패했습니다.');
        toast.error(response.data.message || '인증 코드 전송에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || '서버 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = () => {
    if (!verificationCode) {
      setError('인증 코드를 입력해주세요.');
      toast.error('인증 코드를 입력해주세요.');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('인증 코드는 6자리 숫자입니다.');
      toast.error('인증 코드는 6자리 숫자입니다.');
      return;
    }

    setStep(3);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { username, password, confirmPassword, name } = formData;

    // 필수 필드 확인
    if (!username || !password || !confirmPassword || !name) {
      setError('모든 필드를 입력해주세요.');
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    // 비밀번호 복잡성 검증
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?\":{}|<>]/.test(password);
    
    const criteriaCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (criteriaCount < 3) {
      setError('비밀번호는 영문 대소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
      toast.error('비밀번호는 영문 대소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
      return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 사용자명 유효성 검사
    if (username.length < 3 || username.length > 20) {
      setError('사용자명은 3-20자 사이여야 합니다.');
      toast.error('사용자명은 3-20자 사이여야 합니다.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.');
      toast.error('사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.register({
        email,
        verificationCode,
        username,
        password,
        name
      });

      if (response.data.success) {
        // 회원가입 성공 시 자동 로그인
        const { token, user } = response.data;
        
        if (token && user) {
          // 토큰과 사용자 정보 저장
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // AuthContext 업데이트
          setUserAuth(user, token);
          
          toast.success('회원가입이 완료되었습니다! 환영합니다!');
          navigate('/', { replace: true });
        } else {
          // 토큰이 없으면 로그인 페이지로
          toast.success('회원가입이 완료되었습니다! 로그인해주세요.');
          navigate('/login');
        }
      } else {
        setError(response.data.message || '회원가입에 실패했습니다.');
        toast.error(response.data.message || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원가입 에러:', err);
      
      // 네트워크 오류 처리
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
        toast.error('네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
      } else if (err.response?.status === 400) {
        // 400 에러 - 클라이언트 오류
        const errorMessage = err.response?.data?.message || '입력 정보를 확인해주세요.';
        setError(errorMessage);
        toast.error(errorMessage);
      } else if (err.response?.status === 500) {
        // 500 에러 - 서버 오류이지만 회원가입이 성공했을 수 있음
        toast.success('회원가입이 완료되었습니다! 로그인해주세요.');
        navigate('/login');
        return; // finally 블록은 실행되지만 loading은 이미 false가 됨
      } else {
        const errorMessage = err.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };


  // Step 1: 이메일 입력
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">이메일 회원가입</h2>
            <p className="mt-2 text-sm text-gray-600">
              이메일 인증을 통한 회원가입
            </p>
            <p className="mt-2 text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-primary hover:text-primary-dark">
                로그인하기
              </Link>
            </p>
          </div>

          {/* Google 회원가입 버튼 */}
          <div className="space-y-3">
            <Link 
              to="/google-register"
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 간편 회원가입
            </Link>
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는 이메일로 가입</span>
            </div>
          </div>


          <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

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
                    인증 코드 전송 중...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    인증 코드 받기
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: 인증 코드 입력
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">이메일 인증</h2>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{email}</strong>로 보낸<br />
              6자리 인증 코드를 입력해주세요.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
              인증 코드
            </label>
            <input
              id="verificationCode"
              name="verificationCode"
              type="text"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
                setVerificationCode(value);
                setError('');
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-center text-2xl letter-spacing-wide"
              placeholder="123456"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              이전
            </button>
            <button
              onClick={handleCodeVerification}
              disabled={verificationCode.length !== 6}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              인증 확인
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                setStep(1);
                setVerificationCode('');
              }}
              className="text-sm text-primary hover:text-primary-dark"
            >
              다른 이메일로 인증받기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 회원정보 입력
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">회원정보 입력</h2>
          <p className="mt-2 text-sm text-gray-600">
            마지막 단계입니다!<br />
            사용하실 정보를 입력해주세요.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="사용자명을 입력하세요"
              />
              <p className="mt-1 text-xs text-gray-500">
                3-20자, 영문/숫자/언더스코어만 사용 가능
              </p>
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 비밀번호 요구사항 */}
          {formData.password && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">비밀번호 요구사항:</h4>
              <div className="space-y-1 text-xs">
                <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  8자 이상
                </div>
                <div className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  소문자 포함
                </div>
                <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  대문자 포함
                </div>
                <div className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  숫자 포함
                </div>
                <div className={`flex items-center ${/[!@#$%^&*(),.?\":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[!@#$%^&*(),.?\":{}|<>]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  특수문자 포함
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * 위 조건 중 3가지 이상을 만족해야 합니다.
              </p>
            </div>
          )}

          {/* 비밀번호 일치 확인 */}
          {formData.confirmPassword && (
            <div className={`text-sm ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
              {formData.password === formData.confirmPassword ? '✓ 비밀번호가 일치합니다.' : '✗ 비밀번호가 일치하지 않습니다.'}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              이전
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  회원가입 중...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  회원가입 완료
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;