import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, Calendar, Users, MapPin, Heart, User, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { actorProfileAPI, likeAPI, bookmarkAPI } from '../services/api';

const ActorProfile = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gender: 'all',
    experience: 'all',
    location: 'all',
    specialty: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState(new Set());
  const [userBookmarks, setUserBookmarks] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 프로필들에 대한 사용자의 좋아요/북마크 상태 확인
  const checkUserStatusForProfiles = async (profilesData) => {
    try {
      const profileIds = profilesData.map(profile => profile._id);
      const likeStatuses = new Set();
      const bookmarkStatuses = new Set();
      
      // 각 프로필에 대한 상태를 병렬로 확인
      await Promise.all(profileIds.map(async (profileId) => {
        try {
          const [likeStatus, bookmarkStatus] = await Promise.all([
            likeAPI.getStatus(profileId, 'actor_profile').catch(() => ({ data: { isLiked: false } })),
            bookmarkAPI.getStatus(profileId, 'actor_profile').catch(() => ({ data: { isBookmarked: false } }))
          ]);
          
          if (likeStatus.data.isLiked) {
            likeStatuses.add(profileId);
          }
          if (bookmarkStatus.data.isBookmarked) {
            bookmarkStatuses.add(profileId);
          }
        } catch (error) {
          console.error(`프로필 ${profileId} 상태 확인 실패:`, error);
        }
      }));
      
      setUserLikes(likeStatuses);
      setUserBookmarks(bookmarkStatuses);
      
      console.log('✅ 사용자 상태 로드 완료:', {
        likes: likeStatuses.size,
        bookmarks: bookmarkStatuses.size
      });
    } catch (error) {
      console.error('사용자 상태 확인 실패:', error);
    }
  };

  // 사용자 인증 상태가 변경될 때 상태 초기화
  useEffect(() => {
    if (!isAuthenticated) {
      setUserLikes(new Set());
      setUserBookmarks(new Set());
    }
  }, [isAuthenticated]);

  // 다른 페이지에서의 좋아요/북마크 상태 변경 감지
  useEffect(() => {
    const handleLikeStatusChanged = (event) => {
      const { postId, postType, isLiked, likeCount } = event.detail;
      if (postType === 'actor_profile') {
        // 좋아요 상태 업데이트
        setUserLikes(prev => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        // 프로필 리스트의 좋아요 수 업데이트
        setProfiles(prev => prev.map(profile => 
          profile._id === postId 
            ? { ...profile, likes: likeCount }
            : profile
        ));
        setFilteredProfiles(prev => prev.map(profile => 
          profile._id === postId 
            ? { ...profile, likes: likeCount }
            : profile
        ));
      }
    };

    const handleBookmarkStatusChanged = (event) => {
      const { postId, postType, isBookmarked, bookmarkCount } = event.detail;
      if (postType === 'actor_profile') {
        // 북마크 상태 업데이트
        setUserBookmarks(prev => {
          const newSet = new Set(prev);
          if (isBookmarked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        // 프로필 리스트의 북마크 수 업데이트
        setProfiles(prev => prev.map(profile => 
          profile._id === postId 
            ? { ...profile, bookmarks: bookmarkCount }
            : profile
        ));
        setFilteredProfiles(prev => prev.map(profile => 
          profile._id === postId 
            ? { ...profile, bookmarks: bookmarkCount }
            : profile
        ));
      }
    };

    window.addEventListener('likeStatusChanged', handleLikeStatusChanged);
    window.addEventListener('bookmarkStatusChanged', handleBookmarkStatusChanged);

    return () => {
      window.removeEventListener('likeStatusChanged', handleLikeStatusChanged);
      window.removeEventListener('bookmarkStatusChanged', handleBookmarkStatusChanged);
    };
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
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

        console.log('🔍 프로필 조회 시작:', params);
        const response = await actorProfileAPI.getAll(params);
        console.log('📥 프로필 조회 응답:', response.data);
        
        if (response.data.success) {
          const profilesData = response.data.data || [];
          setProfiles(profilesData);
          setFilteredProfiles(profilesData);
          setTotalPages(response.data.pagination?.pages || 1);
          
          // 로그인된 사용자의 경우 각 프로필에 대한 좋아요/북마크 상태 확인
          if (isAuthenticated && profilesData.length > 0) {
            checkUserStatusForProfiles(profilesData);
          }
        } else {
          throw new Error(response.data.message || '프로필 조회 실패');
        }
      } catch (error) {
        console.error('❌ 프로필 조회 오류:', error);
        
        // 에러 발생 시 빈 배열로 설정하여 "작성된 프로필이 없습니다" 메시지 표시
        setProfiles([]);
        setFilteredProfiles([]);
        
        // 개발 환경에서만 에러 토스트 표시
        if (process.env.NODE_ENV === 'development') {
          toast.error('프로필을 불러오는데 실패했습니다: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [currentPage, filters, searchTerm]);


  // 좋아요 처리
  const handleLike = async (profileId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    try {
      const response = await likeAPI.toggle(profileId, 'actor_profile');
      
      if (response.data.success) {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          if (response.data.isLiked) {
            newSet.add(profileId);
          } else {
            newSet.delete(profileId);
          }
          return newSet;
        });
        
        // 프로필 리스트에서 좋아요 수 업데이트
        setProfiles(prev => prev.map(profile => 
          profile._id === profileId 
            ? { ...profile, likes: response.data.likeCount }
            : profile
        ));
        setFilteredProfiles(prev => prev.map(profile => 
          profile._id === profileId 
            ? { ...profile, likes: response.data.likeCount }
            : profile
        ));
        
        // 상태 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('likeStatusChanged', {
          detail: { postId: profileId, postType: 'actor_profile', isLiked: response.data.isLiked, likeCount: response.data.likeCount }
        }));
        
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 북마크 처리
  const handleBookmark = async (profileId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    try {
      const response = await bookmarkAPI.toggle(profileId, 'actor_profile');
      
      if (response.data.success) {
        setUserBookmarks(prev => {
          const newSet = new Set(prev);
          if (response.data.isBookmarked) {
            newSet.add(profileId);
          } else {
            newSet.delete(profileId);
          }
          return newSet;
        });
        
        // 프로필 리스트에서 북마크 수 업데이트
        setProfiles(prev => prev.map(profile => 
          profile._id === profileId 
            ? { ...profile, bookmarks: response.data.bookmarkCount }
            : profile
        ));
        setFilteredProfiles(prev => prev.map(profile => 
          profile._id === profileId 
            ? { ...profile, bookmarks: response.data.bookmarkCount }
            : profile
        ));
        
        // 상태 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('bookmarkStatusChanged', {
          detail: { postId: profileId, postType: 'actor_profile', isBookmarked: response.data.isBookmarked, bookmarkCount: response.data.bookmarkCount }
        }));
        
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('북마크 오류:', error);
      toast.error('북마크 처리 중 오류가 발생했습니다.');
    }
  };

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
    navigate(`/posts/${profile._id}`);
  };

  // 검색어 변경 시 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // 검색 시 첫 페이지로 이동
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
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
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>

            {/* 경력 필터 */}
            <select
              value={filters.experience}
              onChange={(e) => setFilters(prev => ({ ...prev, experience: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체 경력</option>
              <option value="신인">신인</option>
              <option value="1-2년">1-2년</option>
              <option value="3-5년">3-5년</option>
              <option value="5년 이상">5년 이상</option>
            </select>

            {/* 지역 필터 */}
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체 지역</option>
              <option value="서울">서울</option>
              <option value="경기">경기</option>
              <option value="인천">인천</option>
              <option value="부산">부산</option>
              <option value="대구">대구</option>
              <option value="대전">대전</option>
              <option value="광주">광주</option>
              <option value="울산">울산</option>
              <option value="강원">강원</option>
              <option value="경북">경북</option>
              <option value="경남">경남</option>
              <option value="충북">충북</option>
              <option value="충남">충남</option>
              <option value="전북">전북</option>
              <option value="전남">전남</option>
              <option value="제주">제주</option>
            </select>

            {/* 특기 필터 */}
            <select
              value={filters.specialty}
              onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">전체 특기</option>
              <option value="연극">연극</option>
              <option value="영화">영화</option>
              <option value="드라마">드라마</option>
              <option value="뮤지컬">뮤지컬</option>
              <option value="광고">광고</option>
              <option value="모델링">모델링</option>
              <option value="성우">성우</option>
              <option value="기타">기타</option>
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

        {/* 프로필 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            // 로딩 스켈레톤
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="h-64 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : filteredProfiles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                등록된 배우 프로필이 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                첫 번째 배우 프로필을 등록해보세요!
              </p>
              {isAuthenticated && (
                <button
                  onClick={handleWritePost}
                  className="inline-flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  프로필 등록하기
                </button>
              )}
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <motion.div
                key={profile._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProfileClick(profile)}
              >
                {/* 프로필 이미지 */}
                <div className="h-64 bg-gradient-to-br from-purple-100 to-pink-100 relative overflow-hidden">
                  {profile.images && profile.images.length > 0 ? (
                    (() => {
                      // Cloudinary URL 처리 - 간소화됨!
                      let imageUrl = profile.images[0].url;
                      
                      // Cloudinary URL은 이미 완전한 URL이므로 그대로 사용
                      if (imageUrl.startsWith('https://res.cloudinary.com/')) {
                        console.log(`☁️ [ActorProfile] Cloudinary URL 사용: ${imageUrl}`);
                      } 
                      // 기존 상대 URL 처리 (하위 호환성)
                      else if (imageUrl.startsWith('/uploads/')) {
                        const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin;
                        imageUrl = `${API_BASE_URL}${imageUrl}`;
                        console.log(`🔧 [ActorProfile] 상대 URL 변환: ${imageUrl}`);
                      }
                      // 기타 절대 URL - HTTP를 HTTPS로 강제 변환
                      else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                        if (imageUrl.startsWith('http://')) {
                          imageUrl = imageUrl.replace('http://', 'https://');
                          console.log(`🔒 [ActorProfile] HTTP → HTTPS 변환: ${imageUrl}`);
                        } else {
                          console.log(`🌐 [ActorProfile] HTTPS URL 사용: ${imageUrl}`);
                        }
                      }
                      
                      return (
                        <img 
                          src={imageUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('❌ [ActorProfile] 이미지 로드 실패:', {
                              originalSrc: imageUrl,
                              profileId: profile._id,
                              profileName: profile.name,
                              errorEvent: e
                            });
                            
                            // 다양한 fallback 시도
                            const fallbackUrls = [
                              '/default-image.svg',
                              '/api/placeholder/300/400',
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsnYw8L3RleHQ+PC9zdmc+'
                            ];
                            
                            const currentIndex = fallbackUrls.indexOf(e.target.src);
                            const nextIndex = currentIndex + 1;
                            
                            if (nextIndex < fallbackUrls.length) {
                              e.target.src = fallbackUrls[nextIndex];
                            }
                          }}
                          onLoad={() => {
                            console.log('✅ [ActorProfile] 이미지 로드 성공:', imageUrl);
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {/* 좋아요 버튼 */}
                    <button
                      onClick={(e) => handleLike(profile._id, e)}
                      className={`p-2 rounded-full transition-colors ${
                        userLikes.has(profile._id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                      title="좋아요"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    
                    {/* 북마크 버튼 */}
                    <button
                      onClick={(e) => handleBookmark(profile._id, e)}
                      className={`p-2 rounded-full transition-colors ${
                        userBookmarks.has(profile._id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                      title="저장하기"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 프로필 정보 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {profile.name || '이름 미입력'}
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {profile.experience || '신인'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {profile.gender || '기타'} • {profile.age ? `${profile.age}세` : '나이 미입력'} • {profile.location || '서울'}
                  </p>
                  
                  {profile.specialty && profile.specialty.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {profile.specialty.slice(0, 3).map((spec, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {spec}
                        </span>
                      ))}
                      {profile.specialty.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{profile.specialty.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {profile.content || profile.title || '소개글이 없습니다.'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {profile.views || 0}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1 text-red-500" />
                        {profile.likes || 0}
                      </span>
                      <span className="flex items-center">
                        <Bookmark className="w-4 h-4 mr-1 text-blue-500" />
                        {profile.bookmarks || 0}
                      </span>
                    </div>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(profile.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-gray-700">
                페이지 {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActorProfile; 
