import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react';

const PaymentFail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const error = searchParams.get('error') || '알 수 없는 오류가 발생했습니다.';
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* 실패 아이콘 */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            결제에 실패했습니다
          </h1>
          <p className="text-gray-600">
            결제 처리 중 문제가 발생했습니다.
          </p>
        </div>

        {/* 오류 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">오류 정보</h2>
            
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              
              {orderId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-mono text-sm">{orderId}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">발생 시간</span>
                <span className="text-sm">{new Date().toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 해결 방법 안내 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">해결 방법</h2>
            
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start">
                <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium flex items-center justify-center mt-0.5 mr-3">1</span>
                <span>카드 정보와 한도를 확인해주세요</span>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium flex items-center justify-center mt-0.5 mr-3">2</span>
                <span>네트워크 연결을 확인하고 다시 시도해주세요</span>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium flex items-center justify-center mt-0.5 mr-3">3</span>
                <span>문제가 지속되면 고객센터로 문의해주세요</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            다시 결제하기
          </button>
          
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            요금제 페이지로 돌아가기
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>

        {/* 고객센터 안내 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            고객센터 문의
          </h3>
          <p className="text-sm text-yellow-700">
            결제 관련 문의사항이 있으시면 고객센터로 연락해주세요.
            <br />
            📧 이메일: support@actpiece.com
            <br />
            📞 전화: 02-1234-5678 (평일 09:00-18:00)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;