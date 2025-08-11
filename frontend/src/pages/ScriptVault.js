import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, 
  Sparkles, 
  Bookmark, 
  Calendar, 
  Users, 
  Film, 
  Heart, 
  Eye,
  Trash2,
  Copy,
  X,
  Search,
  Edit3,
  MessageCircle,
  Save,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { 
  actorProfileAPI, 
  actorRecruitmentAPI, 
  modelRecruitmentAPI, 
  communityPostAPI,
  bookmarkAPI 
} from '../services/api';
import { toast } from 'react-hot-toast';

const ScriptVault = () => {
  const { 
    aiGeneratedScripts, 
    loadAIGeneratedScripts, 
    removeAIGeneratedScript,
    isAuthenticated
  } = useAuth();
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ai'); // 'ai', 'saved', 'written'
  const [selectedScript, setSelectedScript] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [editedMemo, setEditedMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'likes', 'views'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  // 실제 데이터를 위한 state 추가
  const [myPosts, setMyPosts] = useState([]);
  const [mySavedPosts, setMySavedPosts] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // 내가 작성한 글 가져오기
  const fetchMyPosts = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
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
      setMyPosts(allMyPosts);
    } catch (error) {
      console.error('내가 작성한 글 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // postType에 따른 API 매핑
  const getAPIByPostType = (postType) => {
    const apiMap = {
      'actor_profile': actorProfileAPI,
      'actor-profile': actorProfileAPI,
      'actor_recruitment': actorRecruitmentAPI,
      'actor-recruitment': actorRecruitmentAPI,
      'model_recruitment': modelRecruitmentAPI,
      'model-recruitment': modelRecruitmentAPI,
      'community_post': communityPostAPI,
      'community': communityPostAPI
    };
    return apiMap[postType];
  };

  // 개별 게시글 정보 가져오기
  const fetchPostById = async (postId, postType) => {
    try {
      const api = getAPIByPostType(postType);
      if (!api) {
        console.error('❌ 지원하지 않는 postType:', postType);
        return null;
      }
      
      console.log(`🔍 ${postType} API로 게시글 ${postId} 조회 중...`);
      const response = await api.getById(postId);
      
      if (response.data.success && response.data.data) {
        console.log(`✅ ${postType} 게시글 조회 성공:`, response.data.data);
        return response.data.data;
      } else {
        console.log(`❌ ${postType} 게시글 조회 실패:`, response.data);
        return null;
      }
    } catch (error) {
      console.error(`❌ ${postType} 게시글 ${postId} 조회 중 오류:`, error);
      return null;
    }
  };

  // 저장한 글 가져오기
  const fetchMySavedPosts = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await bookmarkAPI.getMyBookmarks();
      console.log('🔍 북마크 API 응답:', response.data);
      
      if (response.data.success) {
        // 북마크 데이터 처리 - postType을 boardType으로 변환하고 실제 게시글 데이터 추출
        const processedBookmarks = await Promise.all(
          response.data.bookmarks.map(async (bookmark) => {
            console.log('🔍 개별 북마크 데이터:', bookmark);
            
            // postId가 populate된 경우와 아닌 경우 모두 처리
            let postData;
            let actualPostId;
            
            if (typeof bookmark.postId === 'object' && bookmark.postId !== null) {
              // postId가 populate된 경우 (실제 게시글 객체)
              postData = bookmark.postId;
              actualPostId = postData._id;
              console.log('✅ populate된 postId:', actualPostId, postData);
            } else if (typeof bookmark.postId === 'string') {
              // postId가 단순 문자열 ID인 경우 - 실제 게시글 정보를 API로 가져오기
              actualPostId = bookmark.postId;
              console.log('⚠️ 문자열 postId (populate 안됨), API 호출:', actualPostId, bookmark.postType);
              
              // 실제 게시글 정보를 API로 가져오기
              postData = await fetchPostById(actualPostId, bookmark.postType);
              
              if (!postData) {
                // 게시글을 찾을 수 없는 경우 기본값 설정
                postData = { 
                  _id: actualPostId, 
                  title: '삭제된 게시글입니다', 
                  content: '이 게시글은 삭제되었거나 더 이상 존재하지 않습니다',
                  createdAt: bookmark.createdAt,
                  isDeleted: true
                };
              }
            } else {
              console.error('❌ 유효하지 않은 postId:', bookmark.postId);
              return null;
            }
            
            // postType을 boardType으로 변환
            const boardType = bookmark.postType?.replace(/_/g, '-') || 'community';
            console.log('🔄 postType 변환:', bookmark.postType, '→', boardType);
            
            return {
              ...postData,
              _id: actualPostId,
              bookmarkId: bookmark._id,
              boardType: boardType,
              savedAt: bookmark.createdAt,
              // 북마크 데이터임을 표시
              isBookmark: true
            };
          })
        );
        
        // null 값 제거
        const validBookmarks = processedBookmarks.filter(Boolean);
        console.log('✅ 처리된 북마크 데이터:', validBookmarks);
        setMySavedPosts(validBookmarks);
      }
    } catch (error) {
      console.error('저장한 글 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 저장한 글 데이터 (더미) - 제거됨
  // const getSavedPosts = () => { ... }

  // 내가 작성한 글 데이터 (더미) - 제거됨  
  // const getMyPosts = () => { ... }

  // 컴포넌트 마운트 시 대본 목록 로드
  useEffect(() => {
    loadAIGeneratedScripts();
    if (isAuthenticated) {
      fetchMyPosts();
      fetchMySavedPosts();
    }
  }, [loadAIGeneratedScripts, isAuthenticated]);

  // 탭 변경 시 데이터 새로고침
  useEffect(() => {
    if (activeTab === 'written' && isAuthenticated) {
      fetchMyPosts();
    } else if (activeTab === 'saved' && isAuthenticated) {
      fetchMySavedPosts();
    }
  }, [activeTab, isAuthenticated]);

  // 모달 열기/닫기 시 body 스크롤 제어
  useEffect(() => {
    if (showDetailModal) {
      // 모달이 열릴 때 body 스크롤 비활성화
      document.body.style.overflow = 'hidden';
    } else {
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDetailModal]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showDetailModal) {
        handleCloseModal();
      }
    };

    if (showDetailModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDetailModal]);

  // 대본에서 제목 추출 함수
  const extractTitleFromScript = (scriptContent) => {
    if (!scriptContent) return '';
    
    const lines = scriptContent.split('\n');
    
    // 제목을 찾는 여러 패턴 시도
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // "제목:" 또는 "**제목:**" 패턴
      if (trimmedLine.match(/^\*\*제목:\*\*/i)) {
        let title = trimmedLine.replace(/^\*\*제목:\*\*\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
      
      if (trimmedLine.match(/^제목:/i)) {
        let title = trimmedLine.replace(/^제목:\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
    }
    
    // 제목을 찾지 못했으면 빈 문자열 반환
    return '';
  };

  // 스크립트의 실제 제목 가져오기
  const getScriptDisplayTitle = (script) => {
    // 먼저 대본 내용에서 제목 추출 시도
    const extractedTitle = extractTitleFromScript(script.content);
    
    if (extractedTitle) {
      return extractedTitle;
    }
    
    // 저장된 제목이 'AI 생성 대본'이 아니고 의미있는 제목이면 사용
    if (script.title && 
        script.title !== 'AI 생성 대본' && 
        !script.title.includes('미분류 대본') &&
        !script.title.endsWith(' 대본')) {
      return script.title;
    }
    
    // fallback: 장르와 감정을 조합해서 의미있는 제목 생성
    const genre = script.genre || '미분류';
    const emotion = script.emotion?.split(',')[0]?.trim() || '';
    return `${genre} ${emotion} 대본`.trim();
  };

  // 대본 파싱 및 렌더링 함수 (AIScript.js에서 가져온 것)
  const parseAndRenderScript = (script) => {
    if (!script) return null;

    const lines = script.split('\n');
    const sections = [];
    let currentSection = { type: 'text', content: [] };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 섹션 헤더 감지
      if (trimmedLine.match(/^\*\*제목:\*\*/i) || trimmedLine.match(/^제목:/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'title', content: [line] };
      } else if (trimmedLine.match(/^\*\*상황[ ]?설명:\*\*/i) || trimmedLine.match(/^상황[ ]?설명:/i) || trimmedLine.match(/^\[상황[ ]?설명\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'situation', content: [line] };
      } else if (trimmedLine.match(/^\*\*인물:\*\*/i) || trimmedLine.match(/^인물:/i) || trimmedLine.match(/^\[등장인물\]/i) || trimmedLine.match(/^\[인물\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'character', content: [line] };
      } else if (trimmedLine.match(/^\*\*독백:\*\*/i) || trimmedLine.match(/^독백:/i) || trimmedLine.match(/^\[독백\]/i) || trimmedLine.match(/^\*\*대본:\*\*/i) || trimmedLine.match(/^대본:/i) || trimmedLine.match(/^\[대본\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'dialogue', content: [line] };
      } else if (trimmedLine.match(/^\*\*연기[ ]?팁:\*\*/i) || trimmedLine.match(/^연기[ ]?팁:/i) || trimmedLine.match(/^\*\*연기[ ]?포인트:\*\*/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'tips', content: [line] };
      } else {
        currentSection.content.push(line);
      }
    });

    if (currentSection.content.length > 0) sections.push(currentSection);

    return sections.map((section, index) => {
      const content = section.content.join('\n');
      
      switch (section.type) {
        case 'title':
          return (
            <div key={index} className="mb-6">
              <div className="text-2xl font-bold text-center text-purple-900 bg-gradient-to-r from-purple-100 to-pink-100 py-4 px-6 rounded-xl border-l-4 border-purple-500">
                {content.replace(/^\*\*제목:\*\*\s*/i, '').replace(/^제목:\s*/i, '')}
              </div>
            </div>
          );
        case 'situation':
          return (
            <div key={index} className="mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  상황 설명
                </h3>
                <div className="text-blue-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*상황[ ]?설명:\*\*\s*/i, '').replace(/^상황[ ]?설명:\s*/i, '').replace(/^\[상황[ ]?설명\]\s*/i, '')}
                </div>
              </div>
            </div>
          );
        case 'character':
          return (
            <div key={index} className="mb-6">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-green-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  등장인물
                </h3>
                <div className="text-green-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*인물:\*\*\s*/i, '').replace(/^인물:\s*/i, '').replace(/^\[등장인물\]\s*/i, '').replace(/^\[인물\]\s*/i, '')}
                </div>
              </div>
            </div>
          );
        case 'dialogue':
          return (
            <div key={index} className="mb-6">
              <div className="bg-gray-50 border-l-4 border-gray-400 p-6 rounded-r-lg">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  {section.content[0].includes('독백') ? '독백' : '대본'}
                </h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-base">
                    {content.replace(/^\*\*독백:\*\*\s*/i, '').replace(/^독백:\s*/i, '').replace(/^\[독백\]\s*/i, '').replace(/^\*\*대본:\*\*\s*/i, '').replace(/^대본:\s*/i, '').replace(/^\[대본\]\s*/i, '')}
                  </div>
                </div>
              </div>
            </div>
          );
        case 'tips':
          return (
            <div key={index} className="mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  연기 팁
                </h3>
                <div className="text-yellow-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*연기[ ]?팁:\*\*\s*/i, '').replace(/^연기[ ]?팁:\s*/i, '').replace(/^\*\*연기[ ]?포인트:\*\*\s*/i, '')}
                </div>
              </div>
            </div>
          );
        default:
          return (
            <div key={index} className="mb-4">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          );
      }
    });
  };

  // 대본 삭제 핸들러
  const handleDeleteScript = (scriptId, type) => {
    if (window.confirm('정말로 이 대본을 삭제하시겠습니까?')) {
      if (type === 'ai') {
        removeAIGeneratedScript(scriptId);
      } else {
        // For saved scripts, we'll navigate to a new page or handle deletion differently
        // For now, we'll just show an alert
        alert('저장된 대본은 삭제할 수 없습니다.');
      }
    }
  };

  // 대본 상세 보기
  const handleViewScript = (script) => {
    setSelectedScript(script);
    setShowDetailModal(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedScript(null);
  };

  // 메모 조회 핸들러
  const handleViewMemo = async (scriptId) => {
    try {
      const response = await api.get(`/ai-script/scripts/${scriptId}/memo`);
      const memo = response.data.memo || '';
      setSelectedMemo(memo);
      setEditedMemo(memo);
      setSelectedScriptId(scriptId);
      setIsEditingMemo(false);
      setShowMemoModal(true);
    } catch (error) {
      console.error('메모 조회 오류:', error);
      // API 호출 실패 시 빈 메모로 시작
      setSelectedMemo('');
      setEditedMemo('');
      setSelectedScriptId(scriptId);
      setIsEditingMemo(false);
      setShowMemoModal(true);
      toast.error('메모를 불러오지 못했습니다.');
    }
  };

  // 메모 편집 시작
  const handleStartEditMemo = () => {
    setIsEditingMemo(true);
  };

  // 메모 편집 취소
  const handleCancelEditMemo = () => {
    setEditedMemo(selectedMemo);
    setIsEditingMemo(false);
  };

  // 메모 저장
  const handleSaveMemo = async () => {
    if (!selectedScriptId) {
      toast.error('스크립트 ID가 없습니다.');
      return;
    }

    setIsSavingMemo(true);
    try {
      const response = await api.put(`/ai-script/scripts/${selectedScriptId}/memo`, {
        memo: editedMemo
      });
      
      if (response.data.success) {
        setSelectedMemo(editedMemo);
        setIsEditingMemo(false);
        toast.success('메모가 저장되었습니다!');
      } else {
        throw new Error(response.data.error || '메모 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('메모 저장 오류:', error);
      toast.error(error.response?.data?.error || '메모 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingMemo(false);
    }
  };

  // 메모 모달 닫기
  const handleCloseMemoModal = () => {
    setShowMemoModal(false);
    setSelectedMemo('');
    setEditedMemo('');
    setSelectedScriptId(null);
    setIsEditingMemo(false);
    setIsSavingMemo(false);
  };

  // 현재 탭에 따른 대본/글 목록 가져오기
  const getCurrentScripts = () => {
    let scripts;
    if (activeTab === 'ai') {
      scripts = aiGeneratedScripts;
    } else if (activeTab === 'saved') {
      scripts = mySavedPosts;
    } else if (activeTab === 'written') {
      scripts = myPosts;
    } else {
      scripts = [];
    }
    
    // 검색 필터링
    let filtered = scripts;
    
    if (searchTerm) {
      filtered = filtered.filter(script => 
        script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (script.content && script.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterGenre && activeTab === 'ai') {
      filtered = filtered.filter(script => script.genre === filterGenre);
    }
    
    // 정렬 (AI 대본이 아닌 경우에만)
    if (activeTab !== 'ai') {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'likes':
            aValue = a.likes || 0;
            bValue = b.likes || 0;
            break;
          case 'views':
            aValue = a.views || 0;
            bValue = b.views || 0;
            break;
          case 'createdAt':
          default:
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
        }
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }
    
    return filtered;
  };

  // 장르 목록 추출
  const getGenreOptions = () => {
    const allScripts = aiGeneratedScripts; // AI scripts are not saved, so no savedScripts context
    const genres = [...new Set(allScripts.map(script => script.genre).filter(Boolean))];
    return genres;
  };

  // 시간 포매팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentScripts = getCurrentScripts();

  const handleScriptClick = (script) => {
    if (activeTab === 'ai') {
      setSelectedScript(script);
      setShowDetailModal(true);
    } else {
      // 저장한 글이나 내가 작성한 글의 경우 상세 페이지로 이동
      // 이미 처리된 데이터이므로 script._id를 바로 사용
      if (script._id) {
        // boardType 정보와 함께 URL 파라미터로 전달
        const boardTypeParam = script.boardType ? `?boardType=${script.boardType}` : '';
        navigate(`/posts/${script._id}${boardTypeParam}`);
        console.log('🔗 게시글 페이지로 이동:', `/posts/${script._id}${boardTypeParam}`);
      } else {
        console.error('게시글 ID가 없습니다:', script);
        toast.error('게시글 정보가 올바르지 않습니다.');
      }
    }
  };

  // 게시글 카드 렌더링 (저장한 글, 내가 작성한 글용)
  const renderPostCard = (post) => {
    const isWritten = activeTab === 'written';
    
    return (
      <motion.div
        key={post._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md border-2 border-green-200 hover:border-green-300 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => handleScriptClick(post)}
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                {post.title || '제목 없음'}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBoardTypeColor(post.boardType)}`}>
                  {getBoardTypeName(post.boardType)}
                </span>
              </div>
            </div>
            <Edit3 className="w-5 h-5 text-green-500 flex-shrink-0" />
          </div>

          {/* 내용 미리보기 */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {post.content || '내용 없음'}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {post.views || 0}
              </span>
              <span className="flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                {post.likes || 0}
              </span>
              <span className="flex items-center">
                <MessageCircle className="w-3 h-3 mr-1" />
                {post.comments || 0}
              </span>
            </div>
            <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>

          {/* 작성자 정보 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              작성자: {post.userId?.email || post.author || '익명'}
            </span>
            {!isWritten && post.savedAt && (
              <span className="text-xs text-gray-400">
                저장일: {new Date(post.savedAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 페이지 헤더 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg">
              <Archive className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              📚 나의 대본함
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              AI로 생성한 대본과 저장한 대본을 한곳에서 관리하세요
            </p>
          </motion.div>

          {/* 탭과 필터 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8"
          >
            {/* 탭 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full max-w-4xl">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center px-3 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'ai'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">AI 생성 대본</span>
                  <span className="sm:hidden">AI 대본</span>
                  <span className="ml-1">({aiGeneratedScripts.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex items-center px-3 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'saved'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">저장한 글</span>
                  <span className="sm:hidden">저장글</span>
                  <span className="ml-1">({mySavedPosts.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('written')}
                  className={`flex items-center px-3 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'written'
                      ? 'bg-white text-green-600 shadow-md'
                      : 'text-gray-600 hover:text-green-600'
                  }`}
                >
                  <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">내가 작성한 글</span>
                  <span className="sm:hidden">작성글</span>
                  <span className="ml-1">({myPosts.length})</span>
                </button>
              </div>

              {/* 탭별 필터 */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {activeTab === 'ai' ? (
                  // AI 대본용 필터 (기존)
                  <>
                    {/* 검색 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="대본 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
                      />
                    </div>

                    {/* 장르 필터 */}
                    <select
                      value={filterGenre}
                      onChange={(e) => setFilterGenre(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="">전체 장르</option>
                      {getGenreOptions().map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  // 저장한 글/내가 작성한 글용 필터
                  <>
                    {/* 검색 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="글 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                      />
                    </div>

                    {/* 정렬 기준 */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="createdAt">작성일순</option>
                      <option value="likes">좋아요순</option>
                      <option value="views">조회수순</option>
                    </select>

                    {/* 정렬 순서 */}
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="desc">높은순</option>
                      <option value="asc">낮은순</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* 대본 목록 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {currentScripts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'ai' ? (
                    <Sparkles className="w-12 h-12 text-gray-400" />
                  ) : (
                    <Bookmark className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-500 mb-2">
                  {activeTab === 'ai' ? 'AI 생성 대본이 없습니다' : '저장한 대본이 없습니다'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {activeTab === 'ai' 
                    ? 'AI 대본 생성기를 사용해서 나만의 대본을 만들어보세요!'
                    : '마음에 드는 대본을 저장해보세요!'
                  }
                </p>
                {activeTab === 'ai' && (
                  <button
                    onClick={() => window.location.href = '/ai-script'}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
                  >
                    대본 생성하러 가기
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentScripts.map((script, index) => (
                  activeTab === 'ai' ? (
                    <motion.div
                      key={script.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {getScriptDisplayTitle(script)}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {script.isAIGenerated && (
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI 생성
                              </span>
                            )}
                            {script.characterCount && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                <Users className="w-3 h-3 mr-1" />
                                {script.characterCount}명
                              </span>
                            )}
                            {script.genre && (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Film className="w-3 h-3 mr-1" />
                                {script.genre}
                              </span>
                            )}
                          </div>
                        </div>
                        <Sparkles className="w-6 h-6 text-purple-500 flex-shrink-0" />
                      </div>

                      {/* 대본 미리보기 */}
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm line-clamp-3">
                          {script.content || script.situation || '대본 내용이 없습니다.'}
                        </p>
                      </div>

                      {/* 메타 정보 */}
                      <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(script.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                        {script.mood && (
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {script.mood}
                          </span>
                        )}
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleScriptClick(script)}
                          className="flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMemo(script.id);
                          }}
                          className="flex items-center justify-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          메모
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScript(script.id);
                          }}
                          className="flex items-center justify-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    renderPostCard(script)
                  )
                ))}
              </div>
            )}
          </motion.div>

          {/* 대본 상세 보기 모달 */}
          <AnimatePresence>
            {showDetailModal && selectedScript && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                onClick={handleCloseModal}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-5xl w-full h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* 헤더 - 고정 */}
                  <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {getScriptDisplayTitle(selectedScript)}
                          </h2>
                          <p className="text-gray-600">
                            {selectedScript.isAIGenerated ? 'AI 생성 대본' : '저장된 대본'} · 
                            {selectedScript.characterCount}명 · {selectedScript.genre}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-wrap gap-2 text-sm">
                          {selectedScript.isAIGenerated && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                              AI 생성
                            </span>
                          )}
                          {selectedScript.characterCount && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {selectedScript.characterCount}명
                            </span>
                          )}
                          {selectedScript.genre && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                              {selectedScript.genre}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleCloseModal}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 대본 내용 - 스크롤 가능 영역 */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-8" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
                          {parseAndRenderScript(selectedScript.content)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 액션 버튼 - 고정 */}
                  <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedScript.content);
                          alert('대본이 클립보드에 복사되었습니다!');
                        }}
                        className="flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        복사하기
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        인쇄하기
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (selectedScript.isAIGenerated) {
                              await removeAIGeneratedScript(selectedScript.id);
                            } else {
                              // For user-written scripts, we'll navigate to a new page or handle deletion differently
                              alert('직접 작성 대본은 삭제할 수 없습니다.');
                            }
                            handleCloseModal();
                          } catch (error) {
                            console.error('삭제 실패:', error);
                            alert('삭제 중 오류가 발생했습니다.');
                          }
                        }}
                        className="flex items-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Trash2 className="w-5 h-5 mr-2" />
                        삭제하기
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 메모 조회 모달 */}
          <AnimatePresence>
            {showMemoModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={handleCloseMemoModal}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                          <Edit3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">대본 메모</h2>
                          <p className="text-gray-600">저장된 메모를 확인하세요</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseMemoModal}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 메모 입력/조회 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-lg font-semibold text-gray-800">메모 내용</label>
                        {!isEditingMemo && selectedMemo && (
                          <button
                            onClick={handleStartEditMemo}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors"
                          >
                            수정
                          </button>
                        )}
                      </div>
                      
                      {isEditingMemo || !selectedMemo ? (
                        <>
                          <textarea
                            value={editedMemo}
                            onChange={(e) => setEditedMemo(e.target.value)}
                            placeholder="대본에 대한 메모를 작성하세요...&#10;- 연기 팁&#10;- 감정 포인트&#10;- 무대 설정&#10;- 기타 연출 노트"
                            className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm leading-relaxed"
                            maxLength={1000}
                          />
                          <div className="text-right text-xs text-gray-500">
                            {editedMemo.length} / 1000자
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="bg-white p-4 rounded-lg border border-amber-300 max-h-64 overflow-y-auto">
                              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {selectedMemo}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            {selectedMemo.length} / 1000자
                          </div>
                        </>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    {isEditingMemo ? (
                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveMemo}
                          disabled={isSavingMemo || editedMemo.length > 1000}
                          className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                            isSavingMemo || editedMemo.length > 1000
                              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          {isSavingMemo ? (
                            <div className="flex items-center justify-center space-x-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                              />
                              <span>저장 중...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Save className="w-5 h-5" />
                              <span>메모 저장</span>
                            </div>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditMemo}
                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    ) : !selectedMemo && (
                      <button
                        onClick={handleStartEditMemo}
                        className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Edit3 className="w-5 h-5" />
                          <span>메모 작성하기</span>
                        </div>
                      </button>
                    )}

                    {/* 안내 메시지 */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start text-amber-700">
                        <Edit3 className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">💡 메모 활용 팁</p>
                          <ul className="text-xs space-y-1">
                            <li>• 대본의 감정 포인트나 연기 방향을 기록하세요</li>
                            <li>• 연습하면서 발견한 중요한 부분을 메모하세요</li>
                            <li>• 메모는 브라우저에 저장되어 다음에도 확인할 수 있습니다</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ScriptVault; 