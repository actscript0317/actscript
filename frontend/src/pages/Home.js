import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Eye, Calendar, Heart, User, Mic, GraduationCap, Star, Bookmark, MessageCircle, TrendingUp } from 'lucide-react';
import { emotionAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 결제 성공 알림 처리
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    
    if (paymentStatus === 'success') {
      toast.success(
        `🎉 결제가 완료되었습니다!\n주문번호: ${orderId}\n결제금액: ${parseInt(amount).toLocaleString()}원`,
        {
          duration: 5000,
          style: {
            background: '#059669',
            color: '#fff',
            fontSize: '14px',
            padding: '16px',
          }
        }
      );
      
      // URL에서 파라미터 제거 (깔끔하게)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">😢</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">데이터 로딩 실패</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="bg-white py-8 lg:py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* 왼쪽: 텍스트 콘텐츠 */}
            <div className="order-2 lg:order-1 animate-fade-in-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 opacity-0 animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                <span className="block">대사는 많아도,</span>
                <span className="block">네 이야기는 하나야.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6 max-w-2xl opacity-0 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                수많은 역할 속에서 당신의 목소리를 찾을 수 있도록, 다양한 장르와 상황별 연기 대본을 제공합니다. 오디션 준비부터 감정 연기 연습까지—연기를 사랑하는 모두를 위한 대본 아카이브입니다.
              </p>
              
              {/* CTA 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
                <Link 
                  to="/ai-script" 
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  나만의 대본 만들기
                </Link>
              </div>
            </div>

            {/* 오른쪽: 이미지 */}
            <div className="order-1 lg:order-2 animate-fade-in-right">
              <div className="relative max-w-md mx-auto opacity-0 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                <img 
                  src="/hero-background.png" 
                  alt="연기 무대 - Stories come to life" 
                  className="w-full h-auto aspect-[3/4] object-cover rounded-2xl shadow-2xl"
                  onError={(e) => {
                    e.target.src = "/default-image.svg";
                  }}
                />
                {/* 장식용 배경 요소 */}
                <div className="absolute -z-10 top-8 left-8 w-full h-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl"></div>
                
                {/* 무대 조명 효과 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <div className="container py-16">
        <div className="space-y-16">

        </div>
      </div>
    </div>
  );
};


export default Home; 
