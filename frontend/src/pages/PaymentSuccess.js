import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 누락되었습니다.');
        }

        console.log('결제 승인 요청:', { paymentKey, orderId, amount });

        // 백엔드에 결제 승인 요청
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        });

        const result = await response.json();

        if (result.success) {
          setPaymentResult(result.data);
          console.log('결제 승인 성공:', result.data);
        } else {
          throw new Error(result.error || '결제 승인에 실패했습니다.');
        }

      } catch (error) {
        console.error('결제 승인 오류:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  const handleGoToService = () => {
    navigate('/ai-script');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">결제 처리 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">결제 처리 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/payment')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              다시 결제하기
            </button>
            <button
              onClick={handleGoToHome}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
        {/* 성공 아이콘 */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 완료!</h2>
        <p className="text-gray-600 mb-6">
          결제가 성공적으로 완료되었습니다.
        </p>

        {/* 결제 정보 */}
        {paymentResult && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">결제 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">주문번호</span>
                <span className="font-medium">{paymentResult.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제금액</span>
                <span className="font-bold text-green-600">
                  {paymentResult.totalAmount?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제방법</span>
                <span className="font-medium">{paymentResult.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제일시</span>
                <span className="font-medium">
                  {paymentResult.approvedAt ? 
                    new Date(paymentResult.approvedAt).toLocaleString('ko-KR') : 
                    new Date().toLocaleString('ko-KR')
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            🎉 이제 AI 스크립트 생성 서비스를 무제한으로 이용하실 수 있습니다!
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleGoToService}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            AI 스크립트 생성하러 가기
          </button>
          <button
            onClick={handleGoToHome}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>

        {/* 고객센터 안내 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            문의사항이 있으시면 고객센터로 연락해주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;