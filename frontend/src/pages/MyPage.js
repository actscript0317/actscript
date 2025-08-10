import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Heart, Settings, Eye, Calendar, Users, Bookmark, Sparkles, Palette, Clock,
  Crown, Shield, Bell, Download, Edit, Trash2, AlertTriangle, CreditCard, BarChart3,
  Key, Mail, UserMinus, Search, Copy, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  actorProfileAPI, 
  actorRecruitmentAPI, 
  modelRecruitmentAPI, 
  communityPostAPI,
  bookmarkAPI,
  authAPI,
  adminAPI
} from '../services/api';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const MyPage = () => {
  const { 
    user, 
    isAuthenticated, 
    savedScripts, 
    aiGeneratedScripts, 
    loading,
    initialized,
    removeSavedScript,
    removeAIGeneratedScript,
    logout
  } = useAuth();
  
  const navigate = useNavigate();

  const [myPosts, setMyPosts] = useState([]);
  const [mySavedPosts, setMySavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'vault', 'billing', 'settings', 'admin'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  // 관리자 대시보드 상태
  const [adminStats, setAdminStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // 대본함 관련 상태
  const [vaultTab, setVaultTab] = useState('ai'); // 'ai', 'saved', 'written'
  const [selectedScript, setSelectedScript] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  
  // 사용량 정보 상태 (테스트 플랜)
  const [usageData, setUsageData] = useState({
    used: 0,
    limit: 10,
    totalGenerated: 0,
    planType: 'test',
    nextResetDate: null,
    daysUntilReset: 0
  });
  const [loadingUsage, setLoadingUsage] = useState(true);

  // 게시판 타입별 색상 설정
  const getBoardTypeColor = (boardType) => {
    const colors = {
      'actor-profile': 'bg-purple-100 text-purple-700',
      'actor-recruitment': 'bg-green-100 text-green-700',
      'model-recruitment': 'bg-pink-100 text-pink-700',
      'community': 'bg-blue-100 text-blue-700'
    };
    return colors[boardType] || 'bg-gray-100 text-gray-700';
  };

  // 게시판 타입별 이름 설정
  const getBoardTypeName = (boardType) => {
    const names = {
      'actor-profile': '배우 프로필',
      'actor-recruitment': '배우 모집',
      'model-recruitment': '모델 모집',
      'community': '커뮤니티'
    };
    return names[boardType] || '기타';
  };

  // 날짜 포매팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      setLoadingUsage(true);
      const response = await api.get('/ai-script/usage');
      const { usage } = response.data;
      
      setUsageData({
        used: usage.currentMonth,
        limit: usage.limit || 10,
        totalGenerated: usage.totalGenerated,
        planType: 'test',
        nextResetDate: usage.nextResetDate,
        daysUntilReset: usage.daysUntilReset
      });
    } catch (error) {
      console.error('사용량 정보 로딩 실패:', error);
      // 기본값으로 설정 (테스트 플랜)
      setUsageData(prev => ({
        ...prev,
        used: user?.usage?.currentMonth || 0,
        limit: user?.usage?.monthly_limit || 10,
        totalGenerated: user?.usage?.totalGenerated || 0,
        planType: 'test'
      }));
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        console.log('🔍 내가 작성한 글 가져오기 시작');
        // 여러 게시판에서 내가 작성한 글 가져오기
        const [actorProfiles, actorRecruitments, modelRecruitments, communityPosts] = await Promise.allSettled([
          actorProfileAPI.getMy(),
          actorRecruitmentAPI.getMy(), 
          modelRecruitmentAPI.getMy(),
          communityPostAPI.getMy()
        ]);

        const allMyPosts = [];

        // 각 결과를 처리하고 게시판 타입 추가
        if (actorProfiles.status === 'fulfilled' && actorProfiles.value.data.success) {
          allMyPosts.push(...actorProfiles.value.data.data.map(post => ({ ...post, boardType: 'actor-profile' })));
        }
        if (actorRecruitments.status === 'fulfilled' && actorRecruitments.value.data.success) {
          allMyPosts.push(...actorRecruitments.value.data.data.map(post => ({ ...post, boardType: 'actor-recruitment' })));
        }
        if (modelRecruitments.status === 'fulfilled' && modelRecruitments.value.data.success) {
          allMyPosts.push(...modelRecruitments.value.data.data.map(post => ({ ...post, boardType: 'model-recruitment' })));
        }
        if (communityPosts.status === 'fulfilled' && communityPosts.value.data.success) {
          allMyPosts.push(...communityPosts.value.data.data.map(post => ({ ...post, boardType: 'community' })));
        }

        // 작성일 기준으로 정렬
        allMyPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log('✅ 내가 작성한 글 로딩 완료:', allMyPosts.length, '개');
        setMyPosts(allMyPosts);
      } catch (error) {
        console.error('❌ 내가 작성한 글 불러오기 실패:', error);
        setMyPosts([]);
      }
    };

    const fetchMySavedPosts = async () => {
      try {
        console.log('🔍 저장한 글 가져오기 시작');
        const response = await bookmarkAPI.getMyBookmarks();
        console.log('📋 북마크 API 응답:', response.data);
        
        if (response.data.success) {
          // 북마크 데이터를 가공하여 일관된 구조로 만들기
          const processedBookmarks = response.data.bookmarks.map(bookmark => {
            console.log('🔍 북마크 원본 데이터:', bookmark);
            
            // postId가 populate된 경우와 아닌 경우 모두 처리
            let postData;
            let actualPostId;
            
            if (typeof bookmark.postId === 'object' && bookmark.postId !== null) {
              // postId가 populate된 경우 (실제 게시글 객체)
              postData = bookmark.postId;
              actualPostId = postData._id;
            } else if (typeof bookmark.postId === 'string') {
              // postId가 단순 문자열 ID인 경우
              actualPostId = bookmark.postId;
              postData = { _id: actualPostId, title: '제목 없음', content: '내용 없음' };
            } else {
              console.error('❌ 유효하지 않은 postId:', bookmark.postId);
              return null;
            }
            
            const result = {
              ...postData,
              _id: actualPostId, // 실제 게시글 ID
              bookmarkId: bookmark._id, // 북마크 자체의 ID (삭제 시 사용)
              boardType: bookmark.postType?.replace('_', '-') || 'community', // postType을 boardType으로 변환
              savedAt: bookmark.createdAt // 북마크 생성일
            };
            
            console.log('✅ 가공된 북마크 데이터:', result);
            return result;
          }).filter(Boolean); // null 값 제거
          
          console.log('✅ 저장한 글 처리 완료:', processedBookmarks.length, '개');
          setMySavedPosts(processedBookmarks);
        } else {
          console.log('❌ 북마크 API 실패:', response.data);
          setMySavedPosts([]);
        }
      } catch (error) {
        console.error('❌ 저장한 글 불러오기 실패:', error);
        setMySavedPosts([]);
      }
    };

    if (isAuthenticated && initialized && !loading) {
      fetchMyPosts();
      fetchMySavedPosts();
    }

    // 컴포넌트 언마운트 시 바디 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthenticated, initialized, loading]);

  // 관리자 통계 데이터 로드
  const loadAdminStats = async () => {
    if (user?.role !== 'admin') return;
    
    setAdminLoading(true);
    try {
      const response = await adminAPI.getDashboardStats();
      if (response.data.success) {
        setAdminStats(response.data.data);
      }
    } catch (error) {
      console.error('관리자 통계 로드 실패:', error);
      toast.error('관리자 통계를 불러올 수 없습니다.');
    } finally {
      setAdminLoading(false);
    }
  };

  // 관리자 탭 선택 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      loadAdminStats();
    }
  }, [activeTab, user?.role]);

  // 사용량 정보 로딩
  useEffect(() => {
    if (user && initialized && !loading) {
      fetchUsageInfo();
    }
  }, [user, initialized, loading]);

  // 게시판 경로 가져오기
  const getBoardPath = (board) => {
    const paths = {
      'actor-recruitment': '/actor-recruitment',
      'model-recruitment': '/model-recruitment',
      'actor-info': '/actor-info',
      'actor-profile': '/actor-profile'
    };
    return paths[board] || '/';
  };

  // 저장한 글 삭제
  const removeSavedPost = async (bookmarkId) => {
    try {
      await bookmarkAPI.deleteBookmark(bookmarkId);
      setMySavedPosts(mySavedPosts.filter(post => post.bookmarkId !== bookmarkId));
      toast.success('저장 취소되었습니다.');
    } catch (error) {
      toast.error('저장 취소에 실패했습니다.');
      console.error(error);
    }
  };

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await authAPI.deleteAccount({ password: deletePassword });
      if (response.data.success) {
        toast.success('회원탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.');
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      const errorMessage = error.response?.data?.message || '회원탈퇴 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  // 대본함 관련 함수들
  const filteredAIScripts = aiGeneratedScripts.filter(script => {
    const matchesSearch = script.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !filterGenre || script.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  const filteredSavedPosts = mySavedPosts.filter(post => 
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyPosts = myPosts.filter(post => 
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 대본 상세 보기
  const handleScriptDetail = (script) => {
    setSelectedScript(script);
    setShowDetailModal(true);
    // 모달이 열릴 때 바디 스크롤 비활성화
    document.body.style.overflow = 'hidden';
  };

  // 모달 닫기
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedScript(null);
    // 모달이 닫힐 때 바디 스크롤 복원
    document.body.style.overflow = 'unset';
  };

  // 클립보드 복사
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">마이페이지를 이용하려면 먼저 로그인해주세요.</p>
          <Link to="/login" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // 탭 메뉴
  const tabs = [
    { id: 'overview', label: '대시보드', icon: BarChart3 },
    { id: 'vault', label: '내 대본함', icon: Bookmark },
    { id: 'billing', label: '요금제', icon: CreditCard },
    { id: 'settings', label: '계정 설정', icon: Settings },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: '관리자', icon: Shield }] : [])
  ];

  // 대본함 하위 탭 메뉴
  const vaultTabs = [
    { id: 'ai', label: 'AI 생성 대본', icon: Sparkles, count: aiGeneratedScripts.length },
    { id: 'saved', label: '저장한 글', icon: Bookmark, count: mySavedPosts.length },
    { id: 'written', label: '내가 작성한 글', icon: Users, count: myPosts.length }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 페이지 헤더 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
                  <p className="text-gray-600">안녕하세요, {user?.name || user?.username}님!</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Mail className="w-4 h-4 mr-1" />
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">
                  프리미엄 플랜 (무료 제공)
                </span>
                {user?.subscription?.status === 'active' && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    활성
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* 탭별 콘텐츠 */}
          {activeTab === 'overview' && (
            <div>
              {/* 통계 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">AI 생성 대본</p>
                      <p className="text-2xl font-bold text-gray-900">{aiGeneratedScripts.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">작성한 글</p>
                      <p className="text-2xl font-bold text-gray-900">{myPosts.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Bookmark className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">저장한 글</p>
                      <p className="text-2xl font-bold text-gray-900">{mySavedPosts.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Eye className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">총 조회수</p>
                      <p className="text-2xl font-bold text-gray-900">{myPosts.reduce((sum, post) => sum + (post.views || 0), 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 최근 활동 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600" />
                  최근 활동
                </h2>
                <div className="space-y-4">
                  {[...myPosts, ...mySavedPosts].slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="p-1 bg-gray-100 rounded">
                        <Calendar className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.createdAt || item.savedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 내 대본함 탭 */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              {/* 검색 및 필터 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="제목이나 내용으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  {vaultTab === 'ai' && (
                    <div className="w-full md:w-48">
                      <select
                        value={filterGenre}
                        onChange={(e) => setFilterGenre(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">모든 장르</option>
                        <option value="로맨스">로맨스</option>
                        <option value="코미디">코미디</option>
                        <option value="비극">비극</option>
                        <option value="스릴러">스릴러</option>
                        <option value="드라마">드라마</option>
                        <option value="액션">액션</option>
                        <option value="공포">공포</option>
                        <option value="판타지">판타지</option>
                        <option value="SF">SF</option>
                        <option value="미스터리">미스터리</option>
                        <option value="시대극">시대극</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 대본함 하위 탭 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-0" aria-label="Vault Tabs">
                    {vaultTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setVaultTab(tab.id)}
                          className={`${
                            vaultTab === tab.id
                              ? 'border-purple-500 text-purple-600 bg-purple-50'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          } flex-1 py-4 px-4 border-b-2 font-medium text-sm flex items-center justify-center space-x-2`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                          <span className={`${
                            vaultTab === tab.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                          } px-2 py-1 rounded-full text-xs font-medium`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-6">
                  {/* AI 생성 대본 */}
                  {vaultTab === 'ai' && (
                    <div>
                      {filteredAIScripts.length === 0 ? (
                        <div className="text-center py-12">
                          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">
                            {searchTerm || filterGenre ? '검색 조건에 맞는 대본이 없습니다.' : '아직 AI로 생성한 대본이 없습니다.'}
                          </p>
                          <Link 
                            to="/ai-script" 
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            AI 대본 생성하기 →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredAIScripts.map((script) => (
                            <div key={script._id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{script.title}</h3>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {script.genre && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                        {script.genre}
                                      </span>
                                    )}
                                    {script.length && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                        {script.length}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(script.createdAt)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeAIGeneratedScript(script._id)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleScriptDetail(script)}
                                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                                >
                                  보기
                                </button>
                                <button
                                  onClick={() => copyToClipboard(script.content)}
                                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 저장한 글 */}
                  {vaultTab === 'saved' && (
                    <div>
                      {filteredSavedPosts.length === 0 ? (
                        <div className="text-center py-12">
                          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">
                            {searchTerm ? '검색 조건에 맞는 글이 없습니다.' : '아직 저장한 글이 없습니다.'}
                          </p>
                          <Link 
                            to="/actor-recruitment" 
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            게시판 둘러보기 →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredSavedPosts.map((post) => (
                            <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBoardTypeColor(post.boardType || post.board)}`}>
                                      {getBoardTypeName(post.boardType || post.board)}
                                    </span>
                                  </div>
                                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-3">{post.content}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(post.savedAt || post.createdAt)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeSavedPost(post.bookmarkId)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Link
                                  to={`/posts/${post._id}?from=script-vault`}
                                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm text-center"
                                >
                                  보기
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 내가 작성한 글 */}
                  {vaultTab === 'written' && (
                    <div>
                      {filteredMyPosts.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">
                            {searchTerm ? '검색 조건에 맞는 글이 없습니다.' : '아직 작성한 글이 없습니다.'}
                          </p>
                          <Link 
                            to="/actor-recruitment" 
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            글 작성하기 →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredMyPosts.map((post) => (
                            <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBoardTypeColor(post.boardType)}`}>
                                      {getBoardTypeName(post.boardType)}
                                    </span>
                                  </div>
                                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-3">{post.content}</p>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center">
                                      <Eye className="w-3 h-3 mr-1" />
                                      {post.views || 0}
                                    </span>
                                    <span className="flex items-center">
                                      <Heart className="w-3 h-3 mr-1 text-red-500" />
                                      {post.likes || 0}
                                    </span>
                                    <span className="flex items-center">
                                      <Bookmark className="w-3 h-3 mr-1 text-blue-500" />
                                      {post.bookmarks || 0}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(post.createdAt)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Link
                                  to={`/posts/${post._id}?from=script-vault`}
                                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm text-center"
                                >
                                  보기
                                </Link>
                                <Link
                                  to={`/posts/${post._id}/edit`}
                                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 요금제 탭 */}
          {activeTab === 'billing' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                  현재 요금제
                </h2>
                
                <div className={`rounded-lg p-6 border-2 ${
                  user?.subscription?.plan === 'pro' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' :
                  user?.subscription?.plan === 'premier' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' :
                  'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Crown className="w-6 h-6 text-yellow-500" />
                        <h3 className="text-lg font-bold text-gray-900">
                          프리미엄 플랜 (무료 제공)
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          활성
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">
                        무제한 AI 스크립트 생성 + 모든 프리미엄 기능을 무료로 이용할 수 있습니다.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ₩0
                      </p>
                      <p className="text-sm text-gray-500">/월</p>
                    </div>
                  </div>
                </div>

                {/* 사용량 현황 */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">이번 달 사용량</h3>
                  {loadingUsage ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                      <p className="text-gray-500 mt-2">사용량 정보를 불러오는 중...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {usageData.used}
                        </div>
                        <div className="text-sm text-gray-500">이번 달 생성</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {usageData.limit === null ? '무제한' : `/ ${usageData.limit}회`}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {usageData.totalGenerated}
                        </div>
                        <div className="text-sm text-gray-500">총 생성 횟수</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          usageData.limit !== null && usageData.used >= usageData.limit ?
                          'text-red-600' : 'text-green-600'
                        }`}>
                          {usageData.limit === null ? '무제한' : Math.max(0, usageData.limit - usageData.used)}
                        </div>
                        <div className="text-sm text-gray-500">남은 횟수</div>
                        {usageData.limit !== null && usageData.daysUntilReset > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {usageData.daysUntilReset}일 후 리셋
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 결제 이력 */}
                {user?.subscription?.paymentHistory && user.subscription.paymentHistory.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 이력</h3>
                    <div className="space-y-3">
                      {user.subscription.paymentHistory.slice(0, 5).map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">
                              {payment.planType === 'pro' ? '프로 플랜' : 
                               payment.planType === 'premier' ? '프리미어 플랜' : payment.planType}
                            </div>
                            <div className="text-sm text-gray-500">
                              주문번호: {payment.orderId}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(payment.paymentDate).toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              ₩{payment.amount?.toLocaleString()}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.status === 'completed' ? '완료' :
                               payment.status === 'failed' ? '실패' : '취소'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 이용 중인 플랜</h3>
                  <div className="grid grid-cols-1 gap-6">
                    
                    {/* Test Plan */}
                    <div className="border-2 rounded-lg p-6 border-blue-500 bg-blue-50">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900">테스트 플랜</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-2">₩0</p>
                        <p className="text-sm text-gray-500">/월</p>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex items-center">
                          <span className="text-blue-500 mr-2">✓</span>
                          AI 대본 생성 (월 10회)
                        </li>
                        <li className="flex items-center">
                          <span className="text-blue-500 mr-2">✓</span>
                          모든 장르 지원
                        </li>
                        <li className="flex items-center">
                          <span className="text-blue-500 mr-2">✓</span>
                          모든 길이 스크립트
                        </li>
                        <li className="flex items-center">
                          <span className="text-blue-500 mr-2">✓</span>
                          스크립트 리라이팅 기능
                        </li>
                        <li className="flex items-center">
                          <span className="text-blue-500 mr-2">✓</span>
                          모든 인원수 지원
                        </li>
                      </ul>
                      <button 
                        className="w-full mt-4 py-2 px-4 rounded-lg font-medium border border-blue-300 text-blue-600"
                        disabled
                      >
                        현재 이용 중
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 계정 설정 탭 */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* 계정 정보 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-600" />
                  계정 정보
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                      <input 
                        type="text" 
                        value={user?.name || user?.username || ''} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                        disabled 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <input 
                        type="email" 
                        value={user?.email || ''} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                        disabled 
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      <Edit className="w-4 h-4 mr-2" />
                      프로필 편집
                    </button>
                    <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      <Key className="w-4 h-4 mr-2" />
                      비밀번호 변경
                    </button>
                  </div>
                </div>
              </div>

              {/* 알림 설정 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-gray-600" />
                  알림 설정
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">이메일 알림</h3>
                      <p className="text-sm text-gray-500">새로운 댓글이나 좋아요 알림을 받습니다.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">마케팅 정보</h3>
                      <p className="text-sm text-gray-500">새로운 기능이나 이벤트 정보를 받습니다.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 데이터 관리 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Download className="w-5 h-5 mr-2 text-gray-600" />
                  데이터 관리
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">내 데이터 내보내기</h3>
                      <p className="text-sm text-gray-500">작성한 글과 대본을 JSON 파일로 다운로드합니다.</p>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      다운로드
                    </button>
                  </div>
                </div>
              </div>

              {/* 위험 영역 */}
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h2 className="text-xl font-semibold text-red-600 mb-6 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  위험 영역
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-red-900">회원탈퇴</h3>
                        <p className="text-sm text-red-700 mt-1">
                          계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        회원탈퇴
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 관리자 대시보드 */}
          {activeTab === 'admin' && user?.role === 'admin' && (
            <div className="space-y-8">
              {adminLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : adminStats ? (
                <>
                  {/* 통계 카드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 오늘 방문자 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Eye className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              오늘 방문자
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {adminStats.visitors.today.toLocaleString()}명
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">
                          어제: {adminStats.visitors.yesterday.toLocaleString()}명
                        </span>
                      </div>
                    </div>

                    {/* 전체 사용자 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              전체 사용자
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {adminStats.users.total.toLocaleString()}명
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">
                          오늘 신규: {adminStats.users.today}명
                        </span>
                      </div>
                    </div>

                    {/* AI 대본 생성 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Sparkles className="h-8 w-8 text-purple-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              AI 대본 총 개수
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {adminStats.content.aiScripts.total.toLocaleString()}개
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">
                          오늘 생성: {adminStats.content.aiScripts.today}개
                        </span>
                      </div>
                    </div>

                    {/* 일반 대본 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Palette className="h-8 w-8 text-orange-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              등록된 대본
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {adminStats.content.scripts.total.toLocaleString()}개
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">
                          오늘 등록: {adminStats.content.scripts.today}개
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 주간 통계 */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">주간 통계</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">주간 방문자</h4>
                        <p className="text-2xl font-semibold text-blue-600">
                          {adminStats.visitors.weekly.toLocaleString()}명
                        </p>
                        <p className="text-sm text-gray-600">
                          일평균: {adminStats.visitors.weeklyAvg}명
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">주간 신규 사용자</h4>
                        <p className="text-2xl font-semibold text-green-600">
                          {adminStats.users.weekly.toLocaleString()}명
                        </p>
                        <p className="text-sm text-gray-600">
                          성장률: {adminStats.users.growth}%
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">페이지뷰</h4>
                        <p className="text-2xl font-semibold text-purple-600">
                          {adminStats.visitors.pageViews.weekly.toLocaleString()}회
                        </p>
                        <p className="text-sm text-gray-600">
                          오늘: {adminStats.visitors.pageViews.today}회
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 콘텐츠 통계 */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">콘텐츠 현황</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">배우 프로필</p>
                        <p className="text-xl font-semibold text-purple-600">
                          {adminStats.content.actorProfiles.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">배우 모집</p>
                        <p className="text-xl font-semibold text-green-600">
                          {adminStats.content.actorRecruitments.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">모델 모집</p>
                        <p className="text-xl font-semibold text-pink-600">
                          {adminStats.content.modelRecruitments.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">커뮤니티 글</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {adminStats.content.communityPosts.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 최근 활동 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 최근 가입자 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">최근 가입자</h3>
                      <div className="space-y-3">
                        {adminStats.recentActivity.users.slice(0, 5).map((user) => (
                          <div key={user._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <User className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(user.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 최근 AI 대본 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">최근 AI 대본</h3>
                      <div className="space-y-3">
                        {adminStats.recentActivity.aiScripts.slice(0, 5).map((script) => (
                          <div key={script._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Sparkles className="h-5 w-5 text-purple-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {script.theme}
                                </p>
                                <p className="text-xs text-gray-500">
                                  by {script.user?.username || '알 수 없음'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(script.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 새로고침 버튼 */}
                  <div className="flex justify-center">
                    <button
                      onClick={loadAdminStats}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      통계 새로고침
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">통계 데이터를 불러올 수 없습니다.</p>
                  <button
                    onClick={loadAdminStats}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 회원탈퇴 확인 모달 */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">회원탈퇴 확인</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  정말로 회원탈퇴를 하시겠습니까? 이 작업은 되돌릴 수 없으며, 
                  모든 데이터가 영구적으로 삭제됩니다.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호를 입력하여 확인해주세요
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="비밀번호 입력"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    탈퇴하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 대본 상세 보기 모달 */}
          {showDetailModal && selectedScript && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={closeDetailModal}
            >
              <div 
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 모달 헤더 */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedScript.title}</h2>
                        <p className="text-gray-600">AI 생성 대본</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-wrap gap-2 text-sm">
                        {selectedScript.genre && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {selectedScript.genre}
                          </span>
                        )}
                        {selectedScript.length && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {selectedScript.length}
                          </span>
                        )}
                        {selectedScript.gender && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                            {selectedScript.gender === 'male' ? '남자' : selectedScript.gender === 'female' ? '여자' : '랜덤'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={closeDetailModal}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 대본 내용 */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-800">
                          {selectedScript.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => copyToClipboard(selectedScript.content)}
                      className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors shadow-md"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      복사하기
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors shadow-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      인쇄하기
                    </button>
                    <button
                      onClick={() => {
                        removeAIGeneratedScript(selectedScript._id);
                        closeDetailModal();
                      }}
                      className="flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors shadow-md"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage; 