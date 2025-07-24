import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    return { checks, isValid: passedChecks >= 3 && checks.length };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { password, confirmPassword } = formData;

    // 기본 검증
    if (!password || !confirmPassword) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 강도 검증
    const { isValid } = validatePassword(password);
    if (!isValid) {
      toast.error('비밀번호 요구사항을 확인해주세요.');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.resetPassword(token, { password, confirmPassword });
      
      if (response.data.success) {
        setSuccess(true);
        toast.success('비밀번호가 성공적으로 재설정되었습니다!');
      } else {
        toast.error(response.data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 실패:', error);
      const errorMessage = error.response?.data?.message || '서버 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">재설정 완료!</h2>
            <p className="mt-4 text-gray-600">
              비밀번호가 성공적으로 변경되었습니다.<br />
              새 비밀번호로 로그인해주세요.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">새 비밀번호 설정</h2>
          <p className="mt-2 text-sm text-gray-600">
            보안을 위해 강력한 비밀번호를 설정해주세요.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                새 비밀번호
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
                  placeholder="새 비밀번호를 입력하세요"
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
                <div className={`flex items-center ${passwordValidation.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.checks.length ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  8자 이상
                </div>
                <div className={`flex items-center ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.checks.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  소문자 포함
                </div>
                <div className={`flex items-center ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.checks.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  대문자 포함
                </div>
                <div className={`flex items-center ${passwordValidation.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.checks.number ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  숫자 포함
                </div>
                <div className={`flex items-center ${passwordValidation.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.checks.special ? 'bg-green-500' : 'bg-gray-300'}`}></div>
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
              disabled={loading || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  재설정 중...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  비밀번호 재설정
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;