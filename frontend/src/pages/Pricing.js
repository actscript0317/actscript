import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (planType, amount, planName) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (planType === 'pro' || planType === 'premier') {
      // 결제 페이지로 플랜 정보 전달
      navigate('/payment', { 
        state: { 
          planType, 
          amount, 
          planName 
        }
      });
    }
  };

  const plans = [
    {
      name: '무료 플랜',
      price: '0원',
      period: '영구무료',
      type: 'free',
      amount: 0,
      description: '기본적인 AI 스크립트 체험',
      features: [
        '월 3회 AI 스크립트 생성',
        '기본 장르 지원 (로맨스, 코미디, 드라마)',
        '짧은 길이 스크립트 (1-2분)',
        '커뮤니티 이용',
        '기본 고객지원'
      ],
      limitations: [
        '생성 횟수 제한',
        '고급 장르 미지원',
        '긴 스크립트 생성 불가'
      ],
      buttonText: '현재 플랜',
      buttonColor: 'bg-gray-400 cursor-not-allowed',
      popular: false
    },
    {
      name: '프로 플랜',
      price: '9,900원',
      period: '월',
      type: 'pro',
      amount: 9900,
      description: '확장된 AI 스크립트 생성 서비스',
      features: [
        '월 50회 AI 스크립트 생성',
        '모든 장르 지원 (스릴러, 액션, 공포, 판타지, SF 등)',
        '모든 길이 스크립트 (1-10분)',
        '스크립트 리라이팅 기능',
        '대본함 무제한 저장',
        '우선 고객지원',
        '광고 제거'
      ],
      limitations: [
        '월 생성 횟수 제한 (50회)',
        'AI 모델 선택 제한'
      ],
      buttonText: '프로 플랜 시작하기',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      popular: true
    },
    {
      name: '프리미어 플랜',
      price: '19,900원',
      period: '월',
      type: 'premier',
      amount: 19900,
      description: '무제한 AI 스크립트 + 프리미엄 기능',
      features: [
        '무제한 AI 스크립트 생성',
        '모든 장르 지원 + 실험적 장르',
        '모든 길이 스크립트 (1-15분)',
        '고급 감정 분석 및 맞춤형 대본',
        '스크립트 리라이팅 무제한',
        '대본함 무제한 저장',
        'GPT-4 기반 최고급 AI 모델',
        '캐릭터 분석 및 연기 가이드',
        '1:1 전담 고객지원',
        '새로운 기능 우선 체험',
        '월 1회 전문가 피드백'
      ],
      limitations: [],
      buttonText: '프리미어 시작하기',
      buttonColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            요금제 선택
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            당신의 연기 실력을 한 단계 끌어올릴 AI 스크립트 생성 서비스
          </p>
        </div>

        {/* 요금제 카드 */}
        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {/* 인기 배지 */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    가장 인기있는 플랜
                  </span>
                </div>
              )}

              {/* 플랜 정보 */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period !== '영구무료' && (
                    <span className="text-gray-600 ml-1">/{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              {/* 기능 목록 */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-4">포함된 기능:</h4>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 제한사항 */}
              {plan.limitations.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-4">제한사항:</h4>
                  <ul className="space-y-3">
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li key={limitIndex} className="flex items-start">
                        <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 버튼 */}
              <button
                onClick={() => handleSelectPlan(plan.type, plan.amount, plan.name)}
                disabled={plan.type === 'free'}
                className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${plan.buttonColor}`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ 섹션 */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            자주 묻는 질문
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Q. 무료 플랜으로 시작해서 나중에 업그레이드할 수 있나요?
              </h3>
              <p className="text-gray-600">
                네, 언제든지 프리미엄 플랜으로 업그레이드 가능합니다. 업그레이드 즉시 모든 프리미엄 기능을 이용할 수 있습니다.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Q. 프리미엄 플랜은 자동 갱신되나요?
              </h3>
              <p className="text-gray-600">
                현재는 일회성 결제 방식입니다. 향후 구독 서비스로 전환될 예정이며, 기존 이용자에게는 사전 안내드릴 예정입니다.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Q. 환불이 가능한가요?
              </h3>
              <p className="text-gray-600">
                디지털 상품 특성상 결제 완료 후 환불이 제한됩니다. 궁금한 점이 있으시면 고객센터로 문의해주세요.
              </p>
            </div>
          </div>
        </div>

        {/* CTA 섹션 */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              아직 고민 중이신가요?
            </h2>
            <p className="text-gray-600 mb-6">
              무료 플랜으로 먼저 체험해보세요. 3회의 무료 스크립트 생성으로 AI의 품질을 확인하실 수 있습니다.
            </p>
            <button
              onClick={() => navigate('/ai-script')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              무료로 체험하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;