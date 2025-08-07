import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail, Shield } from 'lucide-react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Register = () => {
  // 단계: 'form' | 'verification' | 'complete'
  const [step, setStep] = useState('form');
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  
  const [verificationData, setVerificationData] = useState({
    code: '',
    tempUserId: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerificationCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // 숫자만, 최대 6자리
    setVerificationData(prev => ({
      ...prev,
      code: value
    }));
  };

  const validateForm = () => {
    const { email, username, password, confirmPassword, name } = formData;

    // 필수 필드 확인
    if (!email || !username || !password || !confirmPassword || !name) {
      toast.error('모든 필드를 입력해주세요.');
      return false;
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식을 입력해주세요.');
      return false;
    }

    // 비밀번호 길이 확인
    if (password.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return false;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return false;
    }

    // 사용자명 길이 확인
    if (username.length < 2 || username.length > 20) {
      toast.error('사용자명은 2-20자 사이여야 합니다.');
      return false;
    }

    // 사용자명 형식 확인
    if (!/^[a-zA-Z0-9_가-힣]+$/.test(username)) {
      toast.error('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.');
      return false;
    }

    return true;
  };

  // 1단계: 회원가입 정보 전송 및 인증 코드 요청
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const { email, username, password, name } = formData;
      
      const response = await authAPI.requestRegister({
        email,
        username,
        password,
        name
      });

      if (response.data.success) {
        setVerificationData(prev => ({
          ...prev,
          tempUserId: response.data.tempUserId
        }));
        setStep('verification');
        toast.success(`${email}로 인증 코드를 발송했습니다.`);
      } else {
        toast.error(response.data.message || '회원가입 요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원가입 에러:', err);
      
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      
      if (err.response?.status === 400) {
        const error = err.response.data?.error;
        if (error === 'DUPLICATE_EMAIL') {
          errorMessage = '이미 가입된 이메일입니다.';
        } else if (error === 'DUPLICATE_USERNAME') {
          errorMessage = '이미 사용 중인 사용자명입니다.';
        } else {
          errorMessage = err.response.data?.message || '입력 데이터를 확인해주세요.';
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증 코드 검증
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();

    if (verificationData.code.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const response = await authAPI.verifyRegister({
        tempUserId: verificationData.tempUserId,
        code: verificationData.code
      });

      if (response.data.success) {
        setStep('complete');
        toast.success('회원가입이 완료되었습니다!');
      } else {
        toast.error(response.data.message || '인증 코드가 올바르지 않습니다.');
      }
    } catch (err) {
      console.error('인증 코드 검증 에러:', err);
      
      let errorMessage = '인증 코드 검증 중 오류가 발생했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || '인증 코드가 올바르지 않습니다.';
      } else if (err.response?.status === 410) {
        errorMessage = '인증 코드가 만료되었습니다. 새로 요청해주세요.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 재전송
  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      
      const response = await authAPI.resendRegisterCode({
        tempUserId: verificationData.tempUserId
      });

      if (response.data.success) {
        toast.success('인증 코드를 다시 발송했습니다.');
      } else {
        toast.error(response.data.message || '인증 코드 재전송에 실패했습니다.');
      }
    } catch (err) {
      console.error('인증 코드 재전송 에러:', err);
      toast.error('인증 코드 재전송 중 오류가 발생했습니다.');
    } finally {
      setResendLoading(false);
    }
  };

  // 완료 화면
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              회원가입 완료!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{formData.name}</strong>님, 환영합니다!
            </p>
            
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-3">🎉 성공적으로 가입되었습니다!</p>
                <p>이제 모든 기능을 사용할 수 있습니다.</p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                로그인하러 가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 인증 코드 입력 화면
  if (step === 'verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              인증 코드 입력
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{formData.email}</strong>로 발송된<br />
              6자리 인증 코드를 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleVerificationSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1 text-center">
                인증 코드
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationData.code}
                onChange={handleVerificationCodeChange}
                className="block w-full px-4 py-3 text-2xl text-center border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary tracking-widest"
                placeholder="000000"
                autoComplete="one-time-code"
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                숫자 6자리를 입력해주세요
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading || verificationData.code.length !== 6}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    인증 중...
                  </div>
                ) : (
                  '인증 완료'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    재전송 중...
                  </div>
                ) : (
                  '인증 코드 재전송'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                ← 회원가입 정보로 돌아가기
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 회원가입 정보 입력 화면 (기본)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
              로그인
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="이메일을 입력하세요"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="사용자명을 입력하세요"
                value={formData.username}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                2-20자, 영문·숫자·한글·언더스코어 사용 가능
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="비밀번호를 입력하세요"
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
              <p className="mt-1 text-xs text-gray-500">
                최소 8자 이상
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="비밀번호를 다시 입력하세요"
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </div>
              ) : (
                '인증 코드 받기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;