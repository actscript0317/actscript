import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Eye, Calendar, Heart, User, Mic, GraduationCap, Star, Bookmark } from 'lucide-react';
import { scriptAPI, emotionAPI } from '../services/api';

const Home = () => {
  const [popularScripts, setPopularScripts] = useState([]);
  const [latestScripts, setLatestScripts] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 카테고리 데이터
  const categories = [
    {
      id: 'female-monologue',
      title: '여자 독백',
      description: '여성 1인 독백 대본',
      icon: User,
      query: 'gender=여자&scriptType=독백&characters=1',
      gradient: 'from-pink-400 to-rose-600',
      iconColor: 'text-pink-100',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=face'
    },
    {
      id: 'male-monologue', 
      title: '남자 독백',
      description: '남성 1인 독백 대본',
      icon: Mic,
      query: 'gender=남자&scriptType=독백&characters=1',
      gradient: 'from-blue-400 to-indigo-600',
      iconColor: 'text-blue-100',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=400&fit=crop&crop=face'
    },
    {
      id: 'entrance-exam',
      title: '입시 대본',
      description: '연기 입시용 대본',
      icon: GraduationCap,
      query: 'purpose=수업/교육',
      gradient: 'from-emerald-400 to-teal-600',
      iconColor: 'text-emerald-100',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop'
    },
    {
      id: 'audition',
      title: '오디션 용',
      description: '오디션 실전 대본',
      icon: Star,
      query: 'purpose=오디션',
      gradient: 'from-amber-400 to-orange-600',
      iconColor: 'text-amber-100',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=400&fit=crop'
    }
  ];

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (query) => {
    navigate(`/scripts?${query}`);
  };

  // 감정별 이모지 매핑
  const getEmotionEmoji = (emotionName) => {
    const emojiMap = {
      '기쁨': '😊',
      '행복': '😄',
      '슬픔': '😢',
      '우울': '😔',
      '분노': '😠',
      '화남': '😡',
      '사랑': '❤️',
      '로맨스': '💕',
      '그리움': '🥺',
      '그리워': '🤗',
      '불안': '😰',
      '걱정': '😟',
      '두려움': '😨',
      '무서움': '😱',
      '절망': '😞',
      '절대절명': '😣',
      '증오': '😤',
      '혐오': '🤮',
      '질투': '😒',
      '시기': '🙄',
      '놀람': '😲',
      '놀라움': '😯',
      '당황': '😅',
      '부끄러움': '😳',
      '수줍음': '☺️',
      '자신감': '😎',
      '당당함': '💪',
      '희망': '🌟',
      '꿈': '✨',
      '평화': '😌',
      '평온': '😴',
      '고민': '🤔',
      '생각': '💭'
    };
    
    // 감정 이름에서 키워드를 찾아서 매핑
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (emotionName.includes(key)) {
        return emoji;
      }
    }
    
    return '🎭'; // 기본 이모지
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 각 API 호출을 개별적으로 처리
        try {
          const popularRes = await scriptAPI.getPopular();
          setPopularScripts(popularRes.data?.scripts || []);
        } catch (error) {
          console.error('인기 대본 로딩 실패:', error);
        }

        try {
          const latestRes = await scriptAPI.getLatest();
          setLatestScripts(latestRes.data?.scripts || []);
        } catch (error) {
          console.error('최신 대본 로딩 실패:', error);
        }

        try {
          const emotionsRes = await emotionAPI.getAll();
          setEmotions(emotionsRes.data?.emotions || []);
        } catch (error) {
          console.error('감정 데이터 로딩 실패:', error);
        }

      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
                  to="/scripts" 
                  className="inline-block bg-emerald-500 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  대본 찾아보기
                </Link>
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
                    e.target.src = "https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=800&fit=crop";
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
          
          {/* 카테고리 섹션 */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">카테고리별 대본 찾기</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                목적과 용도에 맞는 대본을 빠르게 찾아보세요
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategoryClick(category.query)}
                    className="group cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 h-64">
                      {/* 배경 이미지 */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${category.image})` }}
                      ></div>
                      
                      {/* 그라디언트 오버레이 */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-80 group-hover:opacity-70 transition-opacity duration-300`}></div>
                      
                      {/* 어두운 오버레이 (텍스트 가독성) */}
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      
                      {/* 컨텐츠 */}
                      <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">
                        {/* 상단: 아이콘 */}
                        <div className="mb-3">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-20 backdrop-blur-sm ${category.iconColor}`}>
                            <IconComponent className="w-6 h-6" />
                </div>
              </div>
              
                        {/* 하단: 텍스트 */}
                        <div>
                          <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-100 transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-white text-opacity-90 text-sm leading-relaxed">
                            {category.description}
                          </p>
                </div>
              </div>
              
                      {/* 호버 효과 */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-6 h-6 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                </div>
              </div>
                );
              })}
            </div>
          </section>

          {/* 인기 대본 섹션 */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">인기 대본</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                많은 사용자들이 좋아하는 인기 대본들을 확인해보세요
              </p>
                </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {popularScripts.slice(0, 6).map((script) => (
                <ScriptCardHome key={script._id} script={script} />
              ))}
              </div>

            <div className="text-center">
                  <Link
                to="/scripts?sort=popular"
                className="inline-flex items-center px-6 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                인기 대본 더보기
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                  </Link>
            </div>
          </section>



          {/* 감정 카테고리 섹션 */}
          <section>
            <div className="text-center mb-12">
              <h2 className="section-title">감정별 대본 찾기</h2>
              <p className="text-secondary max-w-2xl mx-auto">
                원하는 감정이나 상황에 맞는 대본을 쉽게 찾아보세요
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {emotions.slice(0, 8).map((emotion) => (
                <Link
                  key={emotion._id}
                  to={`/scripts?emotion=${emotion._id}`}
                  className="card-hover text-center group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">{getEmotionEmoji(emotion.name)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{emotion.name}</h3>
                  <p className="text-sm text-secondary">{emotion.description}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA 섹션 */}
          <section className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              나만의 대본을 공유해보세요
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              당신의 창작 대본을 다른 배우들과 공유하고, 
              피드백을 받아보세요
            </p>
            <Link to="/add-script" className="btn btn-primary">
              <Heart className="w-5 h-5 mr-2" />
              대본 등록하기
            </Link>
          </section>

        </div>
      </div>
    </div>
  );
};

// ScriptListItem 컴포넌트
const ScriptListItem = ({ script }) => {
  return (
    <Link
      to={`/scripts/${script._id}`}
      className="script-item group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 mb-2">
            {script.title}
          </h3>
          <p className="text-sm text-secondary mb-3 line-clamp-2">
            {script.situation}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {script.views || 0}
            </span>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(script.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {script.emotion && (
          <span className="emotion-tag ml-4">
            {script.emotion.name}
          </span>
        )}
      </div>
    </Link>
  );
};

// ScriptCardHome 컴포넌트
const ScriptCardHome = ({ script }) => {
  // 좋아요 수 가져오기
  const getLikeCount = (scriptId) => {
    const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
    return likeCounts[scriptId] || 0;
  };

  // 저장 수 가져오기
  const getSaveCount = (scriptId) => {
    const saveCounts = JSON.parse(localStorage.getItem('scriptSaveCounts') || '{}');
    return saveCounts[scriptId] || 0;
  };

  // 카테고리 태그 색상
  const getTagColor = (type) => {
    const colors = {
      gender: 'bg-pink-100 text-pink-800',
      scriptType: 'bg-blue-100 text-blue-800',
      mood: 'bg-purple-100 text-purple-800',
      purpose: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 hover:scale-105 transform">
      {/* 카드 헤더 */}
      <div className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors duration-300">
          {script.title}
        </h3>
        
        {/* 카테고리 태그들 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {script.gender && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor('gender')}`}>
              {script.gender}
            </span>
          )}
          {script.scriptType && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor('scriptType')}`}>
              {script.scriptType}
            </span>
          )}
          {script.mood && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor('mood')}`}>
              {script.mood}
            </span>
          )}
        </div>
        
        {/* 요약문 */}
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          {script.situation && script.situation.length > 80 
            ? `${script.situation.substring(0, 80)}...` 
            : script.situation || '상황 설명이 없습니다.'}
        </p>
        
        {/* 통계 정보 */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {script.views || 0}
            </span>
            <span className="flex items-center">
              <Heart className="w-4 h-4 mr-1 text-red-500" />
              {getLikeCount(script._id)}
            </span>
            <span className="flex items-center">
              <Bookmark className="w-4 h-4 mr-1 text-emerald-500" />
              {getSaveCount(script._id)}
            </span>
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {script.characterCount}명
            </span>
          </div>
          <span>{new Date(script.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
      
      {/* 호버 효과와 버튼 */}
      <div className="relative">
        {/* 호버 시 어두워지는 오버레이 */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        
        {/* 버튼 영역 */}
        <div className="p-6 pt-0">
          <Link
            to={`/scripts/${script._id}`}
            className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-lg font-medium transition-all duration-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg transform group-hover:-translate-y-0.5"
          >
            자세히 보기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 