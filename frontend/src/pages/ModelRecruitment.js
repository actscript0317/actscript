import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Calendar, User, Eye, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ModelRecruitment = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);

  // 더미 데이터
  const dummyPosts = [
    {
      id: 1,
      title: '아이돌 뮤직비디오 출연자 모집',
      author: '뮤직비디오팀',
      category: 'music-video',
      content: '케이팝 아이돌 그룹의 뮤직비디오에 출연할 모델을 모집합니다. 20대 여성 우대',
      recruitmentField: '뮤직비디오 모델',
      applicationMethod: '이메일: mv@example.com',
      createdAt: '2024-01-15',
      views: 342,
      comments: 12
    },
    {
      id: 2,
      title: '화장품 광고 모델 모집',
      author: '광고대행사',
      category: 'advertisement',
      content: '새로운 화장품 브랜드의 광고 모델을 모집합니다. 깔끔한 이미지의 모델을 찾고 있습니다.',
      recruitmentField: '광고 모델',
      applicationMethod: '연락처: 010-9876-5432',
      createdAt: '2024-01-14',
      views: 189,
      comments: 7
    },
    {
      id: 3,
      title: '패션 화보 촬영 모델 모집',
      author: '포토그래퍼',
      category: 'photoshoot',
      content: '봄 시즌 패션 화보 촬영에 참여할 모델을 모집합니다. 포트폴리오 제공 가능합니다.',
      recruitmentField: '화보 모델',
      applicationMethod: '인스타그램: @photographer_kim',
      createdAt: '2024-01-13',
      views: 156,
      comments: 9
    },
    {
      id: 4,
      title: '유튜브 콘텐츠 출연자 모집',
      author: '유튜버',
      category: 'youtube',
      content: '요리 유튜브 채널의 게스트로 출연할 분을 모집합니다. 밝고 활발한 성격 환영',
      recruitmentField: '유튜브 게스트',
      applicationMethod: '카카오톡: @cooking_channel',
      createdAt: '2024-01-12',
      views: 98,
      comments: 4
    }
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'music-video', label: '뮤직비디오' },
    { value: 'advertisement', label: '광고/홍보' },
    { value: 'photoshoot', label: '화보촬영' },
    { value: 'youtube', label: '유튜브' },
    { value: 'etc', label: '기타' }
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">모델/출연자 모집</h1>
          <p className="text-xl text-gray-600">다양한 미디어 출연 기회를 확인하세요</p>
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
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* 카테고리 필터 */}
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                onClick={() => setShowWriteModal(true)}
                className="flex items-center px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
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
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                        {getCategoryLabel(post.category)}
                      </span>
                      <span className="text-sm text-gray-500">
                        모집분야: {post.recruitmentField}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-pink-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      <strong>지원방법:</strong> {post.applicationMethod}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {post.author}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(post.createdAt)}
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {post.views}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments}
                      </span>
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
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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

export default ModelRecruitment; 