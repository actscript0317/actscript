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
  const navigate = useNavigate();
  const { setUserAuth } = useAuth();

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

    // 이메일 형식 확인
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      toast.error('올바른 이메일 형식이 아닙니다.');
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
        username,
        password,
        name
      });

      if (response.data.success) {
        toast.success('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 인증해주세요.');
        
        // 회원가입 후 로그인 페이지로 이동
        navigate('/login', { 
          state: { 
            email: email,
            message: '회원가입이 완료되었습니다. 이메일을 확인한 후 로그인해주세요.' 
          } 
        });
      } else {
        setError(response.data.message || '회원가입에 실패했습니다.');
        toast.error(response.data.message || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원가입 에러:', err);
      
      const errorMessage = err.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
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
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            ActScript에 오신 것을 환영합니다
          </p>
          <p className="mt-2 text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary hover:text-primary-dark">
              로그인하기
            </Link>
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 주소 *
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
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                이름 *
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
                사용자명 *
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
                비밀번호 *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary pr-10"
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
                비밀번호 확인 *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary pr-10"
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

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  회원가입 중...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  회원가입
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              회원가입을 진행하시면{' '}
              <Link to="/terms" className="text-primary hover:text-primary-dark">
                이용약관
              </Link>
              {' '}및{' '}
              <Link to="/privacy" className="text-primary hover:text-primary-dark">
                개인정보처리방침
              </Link>
              에 동의하신 것으로 간주됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;