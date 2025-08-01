import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  const handleRetryPayment = () => {
    navigate('/payment');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const getErrorMessage = (code) => {
    const errorMessages = {
      'PAY_PROCESS_CANCELED': '사용자가 결제를 취소했습니다.',
      'PAY_PROCESS_ABORTED': '결제가 중단되었습니다.',
      'REJECT_CARD_COMPANY': '카드사에서 결제를 거절했습니다.',
      'INVALID_CARD_COMPANY': '유효하지 않은 카드입니다.',
      'NOT_SUPPORTED_INSTALLMENT': '지원하지 않는 할부개월입니다.',
      'EXCEED_MAX_DAILY_PAYMENT_COUNT': '일일 결제 한도를 초과했습니다.',
      'EXCEED_MAX_PAYMENT_AMOUNT': '결제 한도 금액을 초과했습니다.',
      'INVALID_CARD_EXPIRATION': '카드 유효기간이 잘못되었습니다.',
      'INVALID_STOP_CARD': '정지된 카드입니다.',
      'SUSPECT_FRAUD': '의심 거래로 결제가 거절되었습니다.',
      'RESTRICTED_TRANSFER_ACCOUNT': '계좌이체가 제한된 계좌입니다.',
      'INVALID_ACCOUNT_INFO': '계좌 정보가 잘못되었습니다.',
      'INSUFFICIENT_BALANCE': '잔액이 부족합니다.',
      'INVALID_API_KEY': 'API 키가 유효하지 않습니다.'
    };

    return errorMessages[code] || errorMessage || '결제 처리 중 오류가 발생했습니다.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
        {/* 실패 아이콘 */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 실패</h2>
        <p className="text-gray-600 mb-6">
          {getErrorMessage(errorCode)}
        </p>

        {/* 오류 정보 */}
        {(errorCode || orderId) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">오류 정보</h3>
            <div className="space-y-2 text-sm">
              {orderId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-medium">{orderId}</span>
                </div>
              )}
              {errorCode && (
                <div className="flex justify-between">
                  <span className="text-gray-600">오류코드</span>
                  <span className="font-medium">{errorCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">발생시간</span>
                <span className="font-medium">
                  {new Date().toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-yellow-800 mb-2">💡 해결 방법</h4>
          <ul className="text-sm text-yellow-700 text-left space-y-1">
            <li>• 카드 정보를 다시 확인해주세요</li>
            <li>• 카드 한도나 잔액을 확인해주세요</li>
            <li>• 다른 카드로 시도해보세요</li>
            <li>• 문제가 지속되면 고객센터로 문의하세요</li>
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
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

        {/* 고객센터 안내 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">
            결제 관련 문의사항이 있으시면
          </p>
          <div className="text-sm text-blue-600 font-medium">
            고객센터: 1588-1234
          </div>
          <div className="text-xs text-gray-500 mt-1">
            평일 09:00 ~ 18:00 (주말, 공휴일 휴무)
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;