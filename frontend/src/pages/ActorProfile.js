import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, User, Calendar, MapPin, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ActorProfile = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [filters, setFilters] = useState({
    gender: 'all',
    ageGroup: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // 더미 데이터 (나중에 API로 교체)
  const dummyProfiles = [
    {
      id: 1,
      name: '김지영',
      age: 25,
      gender: 'female',
      location: '서울',
      image: '/api/placeholder/300/400',
      introduction: '연극과 영화를 사랑하는 배우입니다. 다양한 역할에 도전하고 싶습니다.',
      experience: '연극 3년, 영화 5편 출연'
    },
    {
      id: 2,
      name: '박준호',
      age: 28,
      gender: 'male',
      location: '부산',
      image: '/api/placeholder/300/400',
      introduction: '액션과 드라마 장르를 좋아하며, 진정성 있는 연기를 추구합니다.',
      experience: '단편영화 10편, 웹드라마 2편'
    },
    {
      id: 3,
      name: '이수민',
      age: 22,
      gender: 'female',
      location: '대구',
      image: '/api/placeholder/300/400',
      introduction: '신인 배우로서 열정적으로 연기에 임하고 있습니다.',
      experience: '연기학원 수료, 뮤지컬 경험'
    },
    {
      id: 4,
      name: '최민석',
      age: 35,
      gender: 'male',
      location: '서울',
      image: '/api/placeholder/300/400',
      introduction: '베테랑 배우로서 후배들과 함께 성장하고 싶습니다.',
      experience: '영화 20편, 드라마 5편'
    }
  ];

  useEffect(() => {
    setProfiles(dummyProfiles);
    setFilteredProfiles(dummyProfiles);
  }, []);

  useEffect(() => {
    let filtered = profiles;

    // 성별 필터
    if (filters.gender !== 'all') {
      filtered = filtered.filter(profile => profile.gender === filters.gender);
    }

    // 나이대 필터
    if (filters.ageGroup !== 'all') {
      filtered = filtered.filter(profile => {
        const age = profile.age;
        switch (filters.ageGroup) {
          case 'teens': return age >= 10 && age < 20;
          case 'twenties': return age >= 20 && age < 30;
          case 'thirties': return age >= 30 && age < 40;
          case 'forties': return age >= 40;
          default: return true;
        }
      });
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(profile =>
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.introduction.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProfiles(filtered);
  }, [profiles, filters, searchTerm]);

  const getAgeGroup = (age) => {
    if (age < 20) return '10대';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    return '40대 이상';
  };

  // 프로필 카테고리 (프로필은 일반적으로 카테고리가 필요 없지만, 글쓰기를 위해 추가)
  const categories = [
    { value: 'profile', label: '프로필 등록' },
    { value: 'introduction', label: '자기소개' },
    { value: 'experience', label: '경력 소개' },
    { value: 'collaboration', label: '협업 문의' }
  ];

  const handleWritePost = () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    navigate('/posts/new?board=actor-profile');
  };

  const handleProfileClick = (profile) => {
    // 프로필 상세 페이지로 이동 (실제로는 posts/:id 형태로)
    navigate(`/posts/${profile.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">배우 프로필</h1>
          <p className="text-xl text-gray-600">다양한 배우들의 프로필을 확인해보세요</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="이름 또는 소개로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* 성별 필터 */}
            <select
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체 성별</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>

            {/* 나이대 필터 */}
            <select
              value={filters.ageGroup}
              onChange={(e) => setFilters(prev => ({ ...prev, ageGroup: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체 나이대</option>
              <option value="teens">10대</option>
              <option value="twenties">20대</option>
              <option value="thirties">30대</option>
              <option value="forties">40대 이상</option>
            </select>

            {/* 결과 개수 */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-700 font-medium">
                총 {filteredProfiles.length}명
              </span>
            </div>

            {/* 프로필 등록 버튼 */}
            {isAuthenticated && (
              <button
                onClick={handleWritePost}
                className="flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                프로필 등록
              </button>
            )}
          </div>
        </div>

        {/* 프로필 카드 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProfileClick(profile)}
            >
              {/* 프로필 이미지 */}
              <div className="h-64 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <User className="w-24 h-24 text-white" />
              </div>

              {/* 프로필 정보 */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {getAgeGroup(profile.age)}
                  </span>
                </div>

                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{profile.age}세</span>
                  <span className="mx-2">•</span>
                  <span>{profile.gender === 'male' ? '남성' : '여성'}</span>
                </div>

                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{profile.location}</span>
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                  {profile.introduction}
                </p>

                <div className="text-xs text-gray-500 mb-4">
                  <strong>경력:</strong> {profile.experience}
                </div>

                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors">
                  프로필 상세보기
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 프로필이 없는 경우 */}
        {filteredProfiles.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 조건에 맞는 프로필이 없습니다
            </h3>
            <p className="text-gray-500">다른 검색 조건을 시도해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActorProfile; 