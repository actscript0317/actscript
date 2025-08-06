import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const navigate = useNavigate();
  const { setUserAuth } = useAuth();

  // 회원가입 정보 제출
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

    if (!/^[a-zA-Z0-9_가-힣]+$/.test(username)) {
      setError('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.');
      toast.error('사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.');
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
        toast.success('회원가입이 완료되었습니다! 이메일을 확인해주세요.');
        setRegistrationComplete(true);
        
        // 개발환경용 매직링크가 있으면 콘솔에 표시
        if (response.data.data?.devMagicLink) {
          console.log('📧 개발용 매직링크:', response.data.data.devMagicLink);
          toast.success('개발용 매직링크가 콘솔에 표시되었습니다!', { duration: 5000 });
        }
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
          const error = err.response.data?.error;
          if (error === 'DUPLICATE_EMAIL') {
            errorMessage = '이미 가입된 이메일입니다. 로그인을 시도해보세요.';
          } else if (error === 'DUPLICATE_USERNAME') {
            errorMessage = '이미 사용 중인 사용자명입니다. 다른 사용자명을 사용해주세요.';
          } else {
            errorMessage = err.response.data?.message || '입력 데이터를 확인해주세요.';
          }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              이메일을 확인해주세요
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{formData.email}</strong>로 인증 링크를 발송했습니다.
            </p>
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium">📧 다음 단계:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>이메일함을 확인하세요</li>
                  <li>스팸함도 확인해보세요</li>
                  <li>인증 링크를 클릭하세요</li>
                  <li>자동으로 로그인 페이지로 이동합니다</li>
                </ol>
              </div>
            </div>
            <div className="mt-6">
              <Link
                to="/login"
                className="text-primary hover:text-primary-dark font-medium"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;