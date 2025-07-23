import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Calendar, User, Eye, MessageCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ActorInfo = () => {
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
      title: '강남 연기 스터디 그룹 멤버 모집',
      author: '연기사랑',
      category: 'study-group',
      content: '매주 토요일 강남에서 모이는 연기 스터디 그룹입니다. 함께 대본 연습하고 피드백 나눠요!',
      createdAt: '2024-01-15',
      views: 234,
      comments: 15
    },
    {
      id: 2,
      title: '홍대 근처 저렴한 연습실 정보 공유',
      author: '연습생',
      category: 'practice-room',
      content: '홍대 근처에 시간당 5천원으로 이용 가능한 연습실 발견했어요. 관심있으신 분들께 정보 공유합니다.',
      createdAt: '2024-01-14',
      views: 178,
      comments: 8
    },
    {
      id: 3,
      title: '추천하는 연기 레슨 선생님 있나요?',
      author: '신인배우',
      category: 'acting-lesson',
      content: '연기 레슨을 받고 싶은데 좋은 선생님 추천해주세요. 서울 지역이면 어디든 괜찮습니다.',
      createdAt: '2024-01-13',
      views: 156,
      comments: 12
    },
    {
      id: 4,
      title: '프로필 촬영 스튜디오 후기',
      author: '포토리뷰어',
      category: 'profile-photo',
      content: '압구정에 있는 프로필 촬영 스튜디오 다녀왔어요. 가격대비 만족스러웠습니다. 후기 남깁니다.',
      createdAt: '2024-01-12',
      views: 89,
      comments: 5
    },
    {
      id: 5,
      title: '소속사 오디션 정보 공유',
      author: '정보공유',
      category: 'management',
      content: '이번 달에 있는 소속사 오디션 정보들을 정리해서 공유드립니다. 도움이 되길 바랍니다.',
      createdAt: '2024-01-11',
      views: 445,
      comments: 23
    }
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'study-group', label: '스터디 그룹' },
    { value: 'practice-room', label: '연습실' },
    { value: 'acting-lesson', label: '연기레슨' },
    { value: 'profile-photo', label: '프로필 촬영' },
    { value: 'management', label: '매니지먼트' },
    { value: 'personal-shoot', label: '개인촬영' },
    { value: 'production-team', label: '제작팀' },
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
                onClick={() => setShowWriteModal(true)}
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
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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

export default ActorInfo; 