import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, X, RefreshCw } from 'lucide-react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getVerificationStatus();
      
      if (response.data.success) {
        setVerificationStatus(response.data.data);
      }
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      setSending(true);
      const response = await authAPI.sendVerification();
      
      if (response.data.success) {
        toast.success('인증 이메일이 전송되었습니다. 이메일을 확인해주세요.');
      } else {
        toast.error(response.data.message || '이메일 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('인증 이메일 전송 실패:', error);
      const errorMessage = error.response?.data?.message || '서버 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // 로딩 중이거나 사용자가 없거나 이미 인증된 경우 표시하지 않음
  if (loading || !user || !verificationStatus || verificationStatus.isEmailVerified || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>이메일 인증이 필요합니다.</strong> 
              <span className="ml-1">
                {verificationStatus.email}로 인증 이메일을 보내드렸습니다.
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={sendVerificationEmail}
            disabled={sending}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                전송 중...
              </>
            ) : (
              <>
                <Mail className="w-3 h-3 mr-1" />
                재전송
              </>
            )}
          </button>
          
          <button
            onClick={() => setDismissed(true)}
            className="inline-flex items-center p-1 text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;