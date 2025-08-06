import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail } from 'lucide-react';
import { authAPI } from '../services/api';
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
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const { email, username, password, name } = formData;
      
      const response = await authAPI.register({
        email,
        username,
        password,
        name
      });

      if (response.data.success) {
        toast.success('회원가입 요청이 완료되었습니다!');
        setRegistrationComplete(true);
      } else {
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
            errorMessage = '이미 가입된 이메일입니다.';
          } else if (error === 'DUPLICATE_USERNAME') {
            errorMessage = '이미 사용 중인 사용자명입니다.';
          } else {
            errorMessage = err.response.data?.message || '입력 데이터를 확인해주세요.';
          }
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              이메일을 확인해주세요
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{formData.email}</strong>로 인증 링크를 발송했습니다.
            </p>
            
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-3">📧 다음 단계:</p>
                <ol className="text-left list-decimal list-inside space-y-2">
                  <li>이메일함을 확인하세요</li>
                  <li>스팸함도 확인해보세요</li>
                  <li>인증 링크를 클릭하세요</li>
                  <li>자동으로 로그인할 수 있습니다</li>
                </ol>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <Link
                to="/login"
                className="w-full flex justify-center py-3 px-4 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                로그인 페이지로 이동
              </Link>
              
              <p className="text-xs text-gray-500">
                이메일 인증 후 로그인할 수 있습니다
              </p>
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                '회원가입'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;