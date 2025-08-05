import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail, Key, Clock } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [step, setStep] = useState(1); // 1: 회원가입 폼, 2: 인증 코드 입력
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10분
  const navigate = useNavigate();
  const { setUserAuth } = useAuth();

  // 1단계: 회원가입 정보 제출
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { email, username, password, confirmPassword, name } = formData;

    // 필수 필드 확인
    if (!email || !username || !password || !confirmPassword || !name) {
      setError('모든 필드를 입력해주세요.');
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      toast.error('올바른 이메일 형식을 입력해주세요.');
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
      
      console.log('📤 회원가입 데이터 전송:', {
        email: email,
        username: username,
        password: '***',
        name: name
      });
      
      const response = await authAPI.register({
        email,
        username,
        password,
        name
      });

      if (response.data.success) {
        toast.success('인증 코드가 이메일로 발송되었습니다!');
        setStep(2); // 인증 코드 입력 단계로 이동
        startTimer(); // 타이머 시작
      } else {
        setError(response.data.message || '회원가입에 실패했습니다.');
        toast.error(response.data.message || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원가입 에러:', err);
      
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      
      if (err.response?.status === 400) {
        if (err.response.data?.errors) {
          errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
        } else {
          errorMessage = err.response.data?.message || '입력 데이터를 확인해주세요.';
        }
      } else if (err.response?.status === 409) {
        errorMessage = err.response.data?.message || '이미 존재하는 정보입니다.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증 코드 확인
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.');
      toast.error('6자리 인증 코드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const response = await authAPI.verifyRegistration({
        email: formData.email,
        code: verificationCode
      });

      if (response.data.success) {
        toast.success('회원가입이 완료되었습니다! 로그인할 수 있습니다.');
        navigate('/login', { 
          state: { 
            email: formData.email,
            message: '회원가입이 완료되었습니다. 로그인해주세요.' 
          } 
        });
      } else {
        setError(response.data.message || '인증에 실패했습니다.');
        toast.error(response.data.message || '인증에 실패했습니다.');
      }
    } catch (err) {
      console.error('인증 에러:', err);
      
      let errorMessage = '인증 중 오류가 발생했습니다.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 재발송
  const handleResendCode = async () => {
    try {
      setLoading(true);
      
      const response = await authAPI.resendRegistrationCode({
        email: formData.email
      });

      if (response.data.success) {
        toast.success('인증 코드가 재발송되었습니다.');
        setTimeLeft(600); // 타이머 리셋
        startTimer();
      } else {
        toast.error(response.data.message || '재발송에 실패했습니다.');
      }
    } catch (err) {
      console.error('재발송 에러:', err);
      toast.error('재발송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 타이머 시작
  const startTimer = () => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerificationChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  const goBack = () => {
    setStep(1);
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
            {step === 1 ? <UserPlus className="h-6 w-6 text-primary" /> : <Key className="h-6 w-6 text-primary" />}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 1 ? '회원가입' : '이메일 인증'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 ? (
              <>
                이미 계정이 있으신가요?{' '}
                <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                  로그인
                </Link>
              </>
            ) : (
              <>
                {formData.email}로 발송된 인증 코드를 입력해주세요
              </>
            )}
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="name" className="sr-only">이름</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="이름"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">이메일</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="이메일"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="username" className="sr-only">사용자명</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="사용자명"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">비밀번호</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="relative">
                <label htmlFor="confirmPassword" className="sr-only">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="비밀번호 확인"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '처리 중...' : '인증 코드 발송'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerificationSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  인증 코드 (6자리)
                </label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  maxLength="6"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-center text-lg tracking-widest"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={handleVerificationChange}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  남은 시간: {formatTime(timeLeft)}
                </div>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || timeLeft > 0}
                  className="text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  재발송
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '인증 중...' : '회원가입 완료'}
              </button>
              
              <button
                type="button"
                onClick={goBack}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                이전 단계로
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;