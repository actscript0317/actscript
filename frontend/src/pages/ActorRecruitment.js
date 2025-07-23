import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Heart, Bookmark, Eye, Calendar, Users, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { likeAPI, bookmarkAPI } from '../services/api';

const ActorRecruitment = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState(new Set());
  const [userBookmarks, setUserBookmarks] = useState(new Set());

  // 더미 데이터 (좋아요, 저장 수 추가)
  const dummyPosts = [
    {
      id: 1,
      title: '장편 독립영화 주연 배우 모집',
      author: '김감독',
      category: 'indie-feature',
      content: '청춘을 주제로 한 독립영화의 주연 배우를 모집합니다. 20대 초반 여성 배우를 찾고 있습니다.\n\n촬영 기간: 2024년 3월 ~ 5월\n촬영 장소: 서울, 경기 일대\n\n요구사항:\n- 20~25세 여성\n- 연기 경험 우대\n- 장기간 촬영 가능한 분\n\n많은 관심과 지원 부탁드립니다.',
      recruitmentField: '주연 배우',
      applicationMethod: '이메일: casting@example.com',
      createdAt: '2024-01-15',
      views: 127,
      comments: 8,
      likes: 23,
      bookmarks: 15
    },
    {
      id: 2,
      title: '웹드라마 조연 배우 모집 (남성)',
      author: '박PD',
      category: 'web-drama',
      content: '로맨스 웹드라마의 남자 조연 배우를 모집합니다. 연기 경험이 있으신 분을 우대합니다.\n\n역할: 남자 주인공의 베스트 프렌드\n촬영 일정: 주말 위주\n\n우대사항:\n- 연기 경험\n- 밝고 활발한 성격\n- 서울 거주자',
      recruitmentField: '조연 배우',
      applicationMethod: '연락처: 010-1234-5678',
      createdAt: '2024-01-14',
      views: 89,
      comments: 5,
      likes: 12,
      bookmarks: 8
    },
    {
      id: 3,
      title: 'OTT 드라마 엑스트라 모집',
      author: '이작가',
      category: 'ott-drama',
      content: '대형 OTT 플랫폼 드라마의 엑스트라를 모집합니다. 다양한 연령대 환영합니다.',
      recruitmentField: '엑스트라',
      applicationMethod: '카카오톡: @casting123',
      createdAt: '2024-01-13',
      views: 256,
      comments: 15,
      likes: 45,
      bookmarks: 32
    },
    {
      id: 4,
      title: '단편영화 주연 배우 모집 (40대 남성)',
      author: '최감독',
      category: 'short-film',
      content: '가족을 주제로 한 단편영화의 아버지 역할을 맡을 배우를 찾습니다.',
      recruitmentField: '주연 배우',
      applicationMethod: '이메일: shortfilm@example.com',
      createdAt: '2024-01-12',
      views: 67,
      comments: 3,
      likes: 8,
      bookmarks: 5
    }
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'commercial-feature', label: '장편 상업영화' },
    { value: 'indie-feature', label: '장편 독립영화' },
    { value: 'short-film', label: '단편영화' },
    { value: 'ott-drama', label: 'OTT/TV 드라마' },
    { value: 'web-drama', label: '웹드라마' }
  ];

  useEffect(() => {
    setPosts(dummyPosts);
    setFilteredPosts(dummyPosts);
  }, []);

  useEffect(() => {
    let filtered = posts;

    // 카테고리 필터
    if (filters.category !== 'all') {
      filtered = filtered.filter(post => post.category === filters.category);
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  }, [posts, filters, searchTerm]);

  const getCategoryLabel = (category) => {
    const categoryObj = categories.find(cat => cat.value === category);
    return categoryObj ? categoryObj.label : '기타';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const handlePostClick = (post) => {
    // 조회수 증가
    setPosts(prev => prev.map(p => 
      p.id === post.id ? { ...p, views: p.views + 1 } : p
    ));
    navigate(`/posts/${post.id}`);
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    try {
      const response = await likeAPI.toggle(postId, 'actor_recruitment');
      
      if (response.data.success) {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          if (response.data.isLiked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: response.data.likeCount }
            : post
        ));
        
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || '좋아요 실패');
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
      toast.error('좋아요 중 오류가 발생했습니다.');
    }
  };

  const handleBookmark = async (postId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    try {
      const response = await bookmarkAPI.toggle(postId, 'actor_recruitment');
      
      if (response.data.success) {
        setUserBookmarks(prev => {
          const newSet = new Set(prev);
          if (response.data.isBookmarked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, bookmarks: response.data.bookmarkCount }
            : post
        ));
        
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || '저장 실패');
      }
    } catch (error) {
      console.error('북마크 오류:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleWritePost = () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    navigate('/posts/new?board=actor-recruitment');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">배우 모집</h1>
          <p className="text-xl text-gray-600">영화, 드라마 배우 모집 정보를 확인하세요</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="제목 또는 내용으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* 카테고리 필터 */}
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            {/* 글쓰기 버튼 */}
            {isAuthenticated && (
              <button
                onClick={handleWritePost}
                className="flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                글쓰기
              </button>
            )}
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {getCategoryLabel(post.category)}
                      </span>
                      <span className="text-sm text-gray-500">
                        모집분야: {post.recruitmentField}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    
                    <div className="text-sm text-gray-500 mb-3">
                      <strong>지원방법:</strong> {post.applicationMethod}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {post.author}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {formatDate(post.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {post.views}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {post.comments}
                        </span>
                      </div>

                      {/* 좋아요, 저장 버튼 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleLike(post.id, e)}
                          className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                            userLikes.has(post.id) 
                              ? 'bg-red-100 text-red-600' 
                              : 'text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <Heart className={`w-4 h-4 mr-1 ${userLikes.has(post.id) ? 'fill-current' : ''}`} />
                          {post.likes}
                        </button>
                        <button
                          onClick={(e) => handleBookmark(post.id, e)}
                          className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                            userBookmarks.has(post.id) 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'text-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 mr-1 ${userBookmarks.has(post.id) ? 'fill-current' : ''}`} />
                          {post.bookmarks}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 게시글이 없는 경우 */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 조건에 맞는 게시글이 없습니다
            </h3>
            <p className="text-gray-500">다른 검색 조건을 시도해보세요.</p>
          </div>
        )}

        {/* 로그인 안내 */}
        {!isAuthenticated && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-center">
              게시글을 작성하려면 <strong>로그인</strong>이 필요합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActorRecruitment; 