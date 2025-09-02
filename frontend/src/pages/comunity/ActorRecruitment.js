import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Heart, Bookmark, Eye, Calendar, Users, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { actorRecruitmentAPI, likeAPI, bookmarkAPI } from '../../services/api';

const ActorRecruitment = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState(new Set());
  const [userBookmarks, setUserBookmarks] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    { value: 'all', label: '전체' },
    { value: '영화', label: '영화' },
    { value: '드라마', label: '드라마' },
    { value: '연극', label: '연극' },
    { value: '뮤지컬', label: '뮤지컬' },
    { value: '광고', label: '광고' },
    { value: '웹드라마', label: '웹드라마' },
    { value: '단편영화', label: '단편영화' },
    { value: '뮤직비디오', label: '뮤직비디오' },
    { value: '기타', label: '기타' }
  ];

  useEffect(() => {
    const fetchRecruitments = async () => {
      try {
        setLoading(true);
        
        const params = {
          page: currentPage,
          limit: 12,
          ...filters,
          search: searchTerm
        };
        
        // 'all' 값들은 제거
        Object.keys(params).forEach(key => {
          if (params[key] === 'all' || params[key] === '') {
            delete params[key];
          }
        });

        console.log('🔍 모집공고 조회 시작:', params);
        const response = await actorRecruitmentAPI.getAll(params);
        console.log('📥 모집공고 조회 응답:', response.data);
        
        if (response.data.success) {
          setPosts(response.data.data || []);
          setFilteredPosts(response.data.data || []);
          setTotalPages(response.data.pagination?.pages || 1);
        } else {
          throw new Error(response.data.message || '모집공고 조회 실패');
        }
      } catch (error) {
        console.error('❌ 모집공고 조회 오류:', error);
        
        // 에러 발생 시 빈 배열로 설정
        setPosts([]);
        setFilteredPosts([]);
        
        // 개발 환경에서만 에러 토스트 표시
        if (process.env.NODE_ENV === 'development') {
          toast.error('모집공고를 불러오는데 실패했습니다: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecruitments();
  }, [currentPage, filters, searchTerm]);

  const getCategoryLabel = (category) => {
    const categoryObj = categories.find(cat => cat.value === category);
    return categoryObj ? categoryObj.label : '기타';
  };

  const handlePostClick = (post) => {
    // 조회수 증가는 백엔드에서 자동 처리
    navigate(`/posts/${post._id || post.id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  };

  const handleWritePost = () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    navigate('/posts/new?board=actor-recruitment');
  };

  // 좋아요 처리
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
        
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 북마크 처리
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
        
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('북마크 오류:', error);
      toast.error('북마크 처리 중 오류가 발생했습니다.');
    }
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
            {loading ? (
              <div className="p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                모집공고를 불러오는 중입니다...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  작성된 모집공고가 없습니다
                </h3>
                <p className="text-gray-500">첫 번째 모집공고를 작성해보세요!</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <motion.div
                  key={post._id || post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {post.category || '기타'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {post.projectType || '상업'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    
                    <div className="text-sm text-gray-500 mb-3">
                      <strong>지원방법:</strong> {post.applicationMethod || '이메일'}
                      {post.contactInfo?.email && ` (${post.contactInfo.email})`}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {post.userId?.email || '익명'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(post.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {post.views || 0}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {post.location || '서울'}
                        </span>
                      </div>

                      {/* 좋아요, 저장 버튼 */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleLike(post._id || post.id, e)}
                          className={`flex items-center px-2 py-1 rounded transition-colors ${
                            userLikes.has(post._id || post.id)
                              ? 'bg-red-100 text-red-600'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Heart className="w-4 h-4 mr-1" />
                          {post.likes || 0}
                        </button>
                        <button
                          onClick={(e) => handleBookmark(post._id || post.id, e)}
                          className={`flex items-center px-2 py-1 rounded transition-colors ${
                            userBookmarks.has(post._id || post.id)
                              ? 'bg-blue-100 text-blue-600'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Bookmark className="w-4 h-4 mr-1" />
                          {post.bookmarks || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center py-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="mx-4 text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
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