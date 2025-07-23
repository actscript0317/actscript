import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Eye, Calendar, Heart, User, Mic, GraduationCap, Star, Bookmark, MessageCircle, TrendingUp } from 'lucide-react';
import { scriptAPI, emotionAPI } from '../services/api';

const Home = () => {
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
                  <Link
                    key={category.id}
                    to={`/scripts?${category.query}`}
                    className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className={`h-48 bg-gradient-to-br ${category.gradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="relative h-full flex flex-col items-center justify-center text-white p-6">
                        <IconComponent className={`w-12 h-12 mb-4 ${category.iconColor}`} />
                        <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                        <p className="text-sm opacity-90 text-center">{category.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 인기 글 TOP 5 섹션 */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">인기 글 TOP 5</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                가장 많은 관심을 받고 있는 글들을 확인해보세요
              </p>
            </div>
            
            <PopularPostsSection />
          </section>



          {/* 감정별 대본 섹션 */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">감정별 대본</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                표현하고 싶은 감정에 맞는 대본을 선택해보세요
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
              {emotions.map((emotion) => (
                <Link
                  key={emotion._id}
                  to={`/scripts?emotion=${emotion._id}`}
                  className="group text-center p-4 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
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

// PopularPostsSection 컴포넌트
const PopularPostsSection = () => {
  // 인기 글 더미 데이터 (좋아요 + 저장수 기준 정렬)
  const popularPosts = [
    {
      id: 1,
      title: '소속사 오디션 정보 공유',
      category: '매니지먼트',
      categoryColor: 'bg-blue-100 text-blue-700',
      author: '정보공유',
      likes: 89,
      bookmarks: 156,
      views: 445,
      comments: 23,
      board: 'actor-info',
      boardName: '연기자 정보방',
      rank: 1
    },
    {
      id: 2,
      title: '아이돌 뮤직비디오 출연자 모집',
      category: '뮤직비디오',
      categoryColor: 'bg-pink-100 text-pink-700',
      author: '뮤직비디오팀',
      likes: 67,
      bookmarks: 43,
      views: 342,
      comments: 12,
      board: 'model-recruitment',
      boardName: '모델/출연자 모집',
      rank: 2
    },
    {
      id: 3,
      title: 'OTT 드라마 엑스트라 모집',
      category: 'OTT/TV 드라마',
      categoryColor: 'bg-purple-100 text-purple-700',
      author: '이작가',
      likes: 45,
      bookmarks: 32,
      views: 256,
      comments: 15,
      board: 'actor-recruitment',
      boardName: '배우 모집',
      rank: 3
    },
    {
      id: 4,
      title: '강남 연기 스터디 그룹 멤버 모집',
      category: '스터디 그룹',
      categoryColor: 'bg-blue-100 text-blue-700',
      author: '연기사랑',
      likes: 42,
      bookmarks: 28,
      views: 234,
      comments: 15,
      board: 'actor-info',
      boardName: '연기자 정보방',
      rank: 4
    },
    {
      id: 5,
      title: '화장품 광고 모델 모집',
      category: '광고/홍보',
      categoryColor: 'bg-pink-100 text-pink-700',
      author: '광고대행사',
      likes: 34,
      bookmarks: 28,
      views: 189,
      comments: 7,
      board: 'model-recruitment',
      boardName: '모델/출연자 모집',
      rank: 5
    }
  ];

  const getBoardPath = (board) => {
    const paths = {
      'actor-recruitment': '/actor-recruitment',
      'model-recruitment': '/model-recruitment',
      'actor-info': '/actor-info',
      'actor-profile': '/actor-profile'
    };
    return paths[board] || '/';
  };

  const getRankIcon = (rank) => {
    const colors = {
      1: 'text-yellow-500',
      2: 'text-gray-400',
      3: 'text-amber-600'
    };
    return colors[rank] || 'text-gray-600';
  };

  const getRankBg = (rank) => {
    const colors = {
      1: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
      2: 'bg-gradient-to-r from-gray-300 to-gray-400',
      3: 'bg-gradient-to-r from-amber-400 to-amber-500'
    };
    return colors[rank] || 'bg-gradient-to-r from-gray-200 to-gray-300';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {popularPosts.map((post) => (
        <Link
          key={post.id}
          to={getBoardPath(post.board)}
          className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          {/* 카드 헤더 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-full ${getRankBg(post.rank)} flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{post.rank}</span>
              </div>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          
          {/* 카드 내용 */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.categoryColor}`}>
                {post.category}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors mb-2 line-clamp-2">
              {post.title}
            </h3>
            
            <p className="text-xs text-gray-500 mb-3">
              {post.boardName}
            </p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {post.author}
              </span>
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {post.views}
              </span>
            </div>
            
            {/* 인기도 지표 */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center text-red-500">
                <Heart className="w-4 h-4 mr-1" />
                <span className="font-medium text-sm">{post.likes}</span>
              </div>
              <div className="flex items-center text-blue-500">
                <Bookmark className="w-4 h-4 mr-1" />
                <span className="font-medium text-sm">{post.bookmarks}</span>
              </div>
              <div className="text-xs text-gray-400">
                인기도 {post.likes + post.bookmarks}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Home; 