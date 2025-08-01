import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Payment = () => {
  const { user } = useAuth();
  const [paymentData, setPaymentData] = useState({
    amount: 9900,
    orderName: 'AI 스크립트 생성 서비스 - 프리미엄 플랜',
    customerName: user?.name || '',
    customerEmail: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // 백엔드에서 결제 준비 데이터 생성
      const response = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error('결제 준비 실패');
      }

      const { data } = await response.json();

      // 나이스페이먼트 결제창 호출 (새 창에서)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://web.nicepay.co.kr/v3/v3Pay.jsp';
      form.target = 'nicepay_popup';
      form.style.display = 'none';

      const formData = {
        MID: process.env.REACT_APP_NICEPAY_CLIENT_KEY,
        Amt: data.amount,
        GoodsName: data.orderName,
        Moid: data.orderId,
        BuyerName: data.customerName,
        BuyerEmail: data.customerEmail,
        ReturnURL: `${window.location.origin}/payment/success`,
        CloseURL: `${window.location.origin}/payment/fail`,
        VbankExpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 8), // 1일 후
        PayMethod: 'CARD', // 카드결제만 허용
        CharSet: 'utf-8'
      };

      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = formData[key];
          form.appendChild(input);
        }
      });

      // 팝업 창 열기
      const popup = window.open('', 'nicepay_popup', 
        'width=500,height=600,scrollbars=yes,resizable=no,toolbar=no,menubar=no'
      );

      if (popup) {
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        // 팝업 창이 닫혔는지 확인하는 인터벌
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setLoading(false);
            // 결제 결과 확인을 위해 페이지 새로고침 (선택사항)
            // window.location.reload();
          }
        }, 1000);
      } else {
        throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      }

    } catch (error) {
      console.error('결제 요청 실패:', error);
      alert(error.message || '결제 요청 중 오류가 발생했습니다.');
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
            <span>나이스페이먼트 안전결제</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;