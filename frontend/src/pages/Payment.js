import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Payment = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const planInfo = location.state;
  
  const [paymentData, setPaymentData] = useState({
    amount: planInfo?.amount || 100,
    orderName: `AI 스크립트 생성 서비스 - ${planInfo?.planName || '프로 플랜'}`,
    customerName: user?.name || '',
    customerEmail: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planInfo) {
      setPaymentData(prev => ({
        ...prev,
        amount: planInfo.amount,
        orderName: `AI 스크립트 생성 서비스 - ${planInfo.planName}`
      }));
    }
  }, [planInfo]);

  // 고유한 주문번호 생성
  const generateOrderId = () => {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  // SDK 동적 로딩 함수
  const loadNicePaySDK = () => {
    return new Promise((resolve, reject) => {
      // 이미 로드되어 있으면 즉시 resolve
      if (typeof window.AUTHNICE !== 'undefined') {
        resolve(window.AUTHNICE);
        return;
      }

      // 기존 스크립트 태그가 있는지 확인
      const existingScript = document.querySelector('script[src*="pay.nicepay.co.kr"]');
      if (existingScript) {
        existingScript.remove();
      }

      // 새로운 스크립트 태그 생성
      const script = document.createElement('script');
      script.src = 'https://pay.nicepay.co.kr/v1/js/';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ 나이스페이먼츠 SDK 로드 완료');
        // SDK 로딩 완료 대기
        setTimeout(() => {
          if (typeof window.AUTHNICE !== 'undefined') {
            resolve(window.AUTHNICE);
          } else {
            reject(new Error('SDK 로딩은 완료되었으나 AUTHNICE 객체를 찾을 수 없습니다.'));
          }
        }, 500);
      };
      
      script.onerror = () => {
        reject(new Error('나이스페이먼츠 SDK 로딩에 실패했습니다.'));
      };
      
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // SDK 로딩 상태 확인
      console.log('SDK 로딩 확인:', {
        AUTHNICE: typeof window.AUTHNICE,
        AUTHNICE_available: window.AUTHNICE !== undefined,
        window_keys: Object.keys(window).filter(key => key.includes('AUTH') || key.includes('NICE'))
      });

      // SDK 로딩 확인 및 필요시 동적 로딩
      await loadNicePaySDK();

      const orderId = generateOrderId();
      const clientKey = 'R2_38961c9b2b494219adacb01cbd31f583'; // 실제 클라이언트 키 직접 사용
      
      console.log('결제 요청 시작:', { 
        orderId, 
        amount: paymentData.amount, 
        orderName: paymentData.orderName,
        clientKey: clientKey
      });

      // 실제 운영 환경에서는 발급받은 실제 클라이언트 키 사용
      console.log('실제 클라이언트 키 사용:', clientKey);

      // 나이스페이먼츠 JS SDK를 사용한 결제창 호출
      window.AUTHNICE.requestPay({
        clientId: clientKey, // 실제 클라이언트 키 사용
        method: 'card', // 결제 수단 (card, bank, vbank 등)
        orderId: orderId,
        amount: paymentData.amount,
        goodsName: paymentData.orderName,
        returnUrl: `http://localhost:10000/api/payment/callback`, // 결제 완료 후 서버 콜백 URL
        buyerName: paymentData.customerName,
        buyerEmail: paymentData.customerEmail,
        mallReserved: JSON.stringify({
          userId: user?._id,
          planType: planInfo?.planType || 'pro'
        }), // 사용자 정보를 콜백에 전달
        
        // 결제 성공 시 콜백
        fnSuccess: function(result) {
          console.log('✅ 결제창 인증 성공:', result);
          
          // 결제 승인 API 호출
          handlePaymentApproval(result);
        },
        
        // 결제 실패 시 콜백
        fnError: function(result) {
          console.error('❌ 결제창 오류:', result);
          alert(`결제 실패: ${result.errorMsg || '알 수 없는 오류가 발생했습니다.'}`);
          setLoading(false);
        }
      });

    } catch (error) {
      console.error('결제 요청 실패:', error);
      alert(error.message || '결제 요청 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 결제 승인 처리
  const handlePaymentApproval = async (authResult) => {
    try {
      console.log('🔄 결제 승인 요청 시작:', authResult);

      // 인증 결과 검증
      if (authResult.authResultCode !== '0000') {
        throw new Error(`결제 인증 실패: ${authResult.authResultMsg}`);
      }

      // 백엔드에 결제 승인 요청
      const response = await fetch('/api/payment/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tid: authResult.tid,
          amount: authResult.amount,
          orderId: authResult.orderId,
          authToken: authResult.authToken,
          signature: authResult.signature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '결제 승인 요청 실패');
      }

      const approvalResult = await response.json();
      console.log('✅ 결제 승인 완료:', approvalResult);

      if (approvalResult.success) {
        // 결제 성공 페이지로 이동
        navigate('/payment/success', { 
          state: { 
            paymentResult: approvalResult.data,
            planInfo: planInfo
          }
        });
      } else {
        throw new Error(approvalResult.message || '결제 승인 실패');
      }

    } catch (error) {
      console.error('❌ 결제 승인 실패:', error);
      alert(`결제 승인 실패: ${error.message}`);
      
      // 결제 실패 페이지로 이동
      navigate('/payment/fail', { 
        state: { 
          error: error.message,
          orderId: authResult?.orderId
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            결제하기
          </h1>
          <p className="text-gray-600">
            AI 스크립트 생성 서비스 이용권을 구매하세요
          </p>
        </div>

        {/* 상품 정보 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">상품 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">상품명</span>
              <span className="font-medium">{paymentData.orderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제금액</span>
              <span className="font-bold text-blue-600">
                {paymentData.amount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 주문자 정보 */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">주문자 정보</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                name="customerName"
                value={paymentData.customerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                name="customerEmail"
                value={paymentData.customerEmail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* API 키 안내 */}
        {(!process.env.REACT_APP_NICEPAY_CLIENT_KEY) && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  테스트 모드
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>나이스페이먼츠 API 키가 설정되지 않았습니다.</p>
                  <p className="mt-1">실제 결제를 위해서는 API 키를 설정해주세요.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 결제 약관 */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <h4 className="font-medium mb-2">결제 약관</h4>
            <ul className="space-y-1 text-xs">
              <li>• 결제 완료 후 즉시 서비스 이용이 가능합니다.</li>
              <li>• 디지털 상품 특성상 결제 후 취소/환불이 제한됩니다.</li>
              <li>• 문의사항은 고객센터로 연락해주세요.</li>
            </ul>
          </div>
        </div>

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={loading || !paymentData.customerName || !paymentData.customerEmail}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading || !paymentData.customerName || !paymentData.customerEmail
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              결제 처리 중...
            </div>
          ) : (
            `${paymentData.amount.toLocaleString()}원 결제하기`
          )}
        </button>

        {/* 보안 정보 */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>나이스페이먼츠 안전결제</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;