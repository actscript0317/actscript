import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Heart, Bookmark, Eye, Calendar, Users, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { communityPostAPI, likeAPI, bookmarkAPI } from '../services/api';

const ActorInfo = () => {
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
    { value: '오디션 정보', label: '오디션 정보' },
    { value: '연기 팁', label: '연기 팁' },
    { value: '업계 소식', label: '업계 소식' },
    { value: '스터디 모집', label: '스터디 모집' },
    { value: '장비 대여', label: '장비 대여' },
    { value: '질문/답변', label: '질문/답변' },
    { value: '후기/리뷰', label: '후기/리뷰' },
    { value: '네트워킹', label: '네트워킹' },
    { value: '교육/강의', label: '교육/강의' },
    { value: '자유게시판', label: '자유게시판' },
    { value: '기타', label: '기타' }
  ];

  useEffect(() => {
    const fetchPosts = async () => {
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

        console.log('🔍 커뮤니티 게시글 조회 시작:', params);
        const response = await communityPostAPI.getAll(params);
        console.log('📥 커뮤니티 게시글 조회 응답:', response.data);
        
        if (response.data.success) {
          setPosts(response.data.data || []);
          setFilteredPosts(response.data.data || []);
          setTotalPages(response.data.pagination?.pages || 1);
        } else {
          throw new Error(response.data.message || '커뮤니티 게시글 조회 실패');
        }
      } catch (error) {
        console.error('❌ 커뮤니티 게시글 조회 오류:', error);
        
        // 에러 발생 시 빈 배열로 설정
        setPosts([]);
        setFilteredPosts([]);
        
        // 개발 환경에서만 에러 토스트 표시
        if (process.env.NODE_ENV === 'development') {
          toast.error('커뮤니티 게시글을 불러오는데 실패했습니다: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, filters, searchTerm]);

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
      const response = await likeAPI.toggle(postId, 'actor_info');
      
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
      const response = await bookmarkAPI.toggle(postId, 'actor_info');
      
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
    navigate('/posts/new?board=actor-info');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">연기자 정보방</h1>
          <p className="text-xl text-gray-600">연기자들을 위한 유용한 정보를 공유하는 공간입니다</p>
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
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 카테고리 필터 */}
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
              <div className="p-6 text-center">로딩 중...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 조건에 맞는 게시글이 없습니다
                </h3>
                <p className="text-gray-500">다른 검색 조건을 시도해보세요.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
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
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {getCategoryLabel(post.category)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      
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
            <span className="mx-2 text-gray-700">
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

export default ActorInfo; 