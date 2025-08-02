import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, CreditCard, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');
  const tid = searchParams.get('tid');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // 사용자 정보 새로고침 (구독 상태 업데이트)
    if (refreshUser) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const formatAmount = (amt) => {
    return parseInt(amt).toLocaleString();
  };

  const getPlanName = (amt) => {
    if (amt === '100' || amt === 100) return '프로 플랜';
    if (amt === '19900' || amt === 19900) return '프리미어 플랜';
    return '플랜';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* 성공 아이콘 */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            결제가 완료되었습니다!
          </h1>
          <p className="text-gray-600">
            {getPlanName(amount)} 구독이 활성화되었습니다.
          </p>
        </div>

        {/* 결제 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
              결제 정보
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">상품명</span>
                <span className="font-medium">AI 스크립트 생성 서비스 - {getPlanName(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제 금액</span>
                <span className="font-bold text-green-600">₩{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono text-sm">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">거래번호</span>
                <span className="font-mono text-sm">{tid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제일시</span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-gray-400" />
                  {new Date().toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 구독 정보 카드 */}
        {user?.subscription && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                구독 정보
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">현재 플랜</span>
                  <span className="font-medium text-purple-600">
                    {user.subscription.plan === 'pro' ? '프로 플랜' : 
                     user.subscription.plan === 'premier' ? '프리미어 플랜' : '무료 플랜'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">구독 상태</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.subscription.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>
                {user.subscription.endDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">만료일</span>
                    <span>{new Date(user.subscription.endDate).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/ai-script')}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            AI 스크립트 생성하기
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          
          <button
            onClick={() => navigate('/mypage?tab=billing')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            구독 관리하기
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>

        {/* 안내사항 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">📧 결제 확인</h3>
          <p className="text-sm text-blue-700">
            결제 완료 확인서가 등록하신 이메일({user?.email})로 발송됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;