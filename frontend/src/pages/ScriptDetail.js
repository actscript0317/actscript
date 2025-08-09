import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Eye, Calendar, Heart, Clock, Target, User, Palette, Bookmark } from 'lucide-react';
import { scriptAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ScriptDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    addLikedScript, 
    removeLikedScript, 
    isScriptLiked,
    addSavedScript,
    removeSavedScript,
    isScriptSaved
  } = useAuth();
  const [script, setScript] = useState(null);
  const [relatedScripts, setRelatedScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 실제 API 호출
      const response = await scriptAPI.getById(id);
      
      setScript(response.data.script);
      setRelatedScripts(response.data.relatedScripts || []);

    } catch (error) {
      console.error('대본 조회 실패:', error);
      setError('대본을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const incrementViewCount = useCallback(async () => {
    try {
      // 조회수 증가 로직 (로컬 스토리지 기반)
      const viewKey = `script_viewed_${id}`;
      const hasViewed = sessionStorage.getItem(viewKey);
      
      if (!hasViewed) {
        console.log(`대본 ${id} 조회수 증가 완료`);
        sessionStorage.setItem(viewKey, 'true');
      }
    } catch (error) {
      console.warn('조회수 업데이트 실패:', error);
    }
  }, [id]);

  // 좋아요 수 로드
  const loadLikeCount = useCallback(() => {
    const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
    const count = likeCounts[id] || 0;
    setLikeCount(count);
  }, [id]);

  // 저장 수 로드
  const loadSaveCount = useCallback(() => {
    const saveCounts = JSON.parse(localStorage.getItem('scriptSaveCounts') || '{}');
    const count = saveCounts[id] || 0;
    setSaveCount(count);
  }, [id]);

  // 좋아요 상태 확인
  const checkLikeStatus = useCallback(() => {
    if (isAuthenticated) {
      const liked = isScriptLiked(id);
      setIsLiked(liked);
    } else {
      setIsLiked(false);
    }
  }, [id, isAuthenticated, isScriptLiked]);

  // 저장 상태 확인
  const checkSaveStatus = useCallback(() => {
    if (isAuthenticated) {
      const saved = isScriptSaved(id);
      setIsSaved(saved);
    } else {
      setIsSaved(false);
    }
  }, [id, isAuthenticated, isScriptSaved]);

  // 좋아요 토글
  const handleLikeToggle = useCallback(() => {
    if (!isAuthenticated) {
      alert('좋아요 기능을 사용하려면 로그인해주세요.');
      return;
    }

    if (!script) return;

    if (isLiked) {
      // 좋아요 취소
      removeLikedScript(id);
      setIsLiked(false);
      
      // 전체 좋아요 수 감소
      const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
      likeCounts[id] = Math.max((likeCounts[id] || 0) - 1, 0);
      localStorage.setItem('scriptLikeCounts', JSON.stringify(likeCounts));
      setLikeCount(likeCounts[id]);
    } else {
      // 좋아요 추가
      addLikedScript(script);
      setIsLiked(true);
      
      // 전체 좋아요 수 증가
      const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
      likeCounts[id] = (likeCounts[id] || 0) + 1;
      localStorage.setItem('scriptLikeCounts', JSON.stringify(likeCounts));
      setLikeCount(likeCounts[id]);
    }
  }, [id, isAuthenticated, isLiked, script, addLikedScript, removeLikedScript]);

  // 저장 토글
  const handleSaveToggle = useCallback(() => {
    if (!isAuthenticated) {
      alert('저장 기능을 사용하려면 로그인해주세요.');
      return;
    }

    if (!script) return;

    if (isSaved) {
      // 저장 취소
      removeSavedScript(id);
      setIsSaved(false);
      
      // 전체 저장 수 감소
      const saveCounts = JSON.parse(localStorage.getItem('scriptSaveCounts') || '{}');
      saveCounts[id] = Math.max((saveCounts[id] || 0) - 1, 0);
      localStorage.setItem('scriptSaveCounts', JSON.stringify(saveCounts));
      setSaveCount(saveCounts[id]);
    } else {
      // 저장 추가
      addSavedScript(script);
      setIsSaved(true);
      
      // 전체 저장 수 증가
      const saveCounts = JSON.parse(localStorage.getItem('scriptSaveCounts') || '{}');
      saveCounts[id] = (saveCounts[id] || 0) + 1;
      localStorage.setItem('scriptSaveCounts', JSON.stringify(saveCounts));
      setSaveCount(saveCounts[id]);
    }
  }, [id, isAuthenticated, isSaved, script, addSavedScript, removeSavedScript]);

  useEffect(() => {
    if (!id) return;

    // 즉시 실행 함수로 비동기 작업 처리
    (async () => {
      // 1. 대본 데이터 로드
      await fetchScript();
      
      // 2. 조회수 증가 (세션당 한 번만)
      await incrementViewCount();
      
      // 3. 더미 좋아요 수 데이터 초기화 (한 번만)
      const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
      if (Object.keys(likeCounts).length === 0) {
        const initialLikeCounts = {
          '1': 23,  // 첫사랑의 추억
          '2': 15,  // 이별의 순간
          '3': 31,  // 희망의 메시지
          '4': 8,   // 친구와의 갈등
          '5': 42   // 가족의 사랑
        };
        localStorage.setItem('scriptLikeCounts', JSON.stringify(initialLikeCounts));
      }

      // 4. 더미 저장 수 데이터 초기화 (한 번만)
      const saveCounts = JSON.parse(localStorage.getItem('scriptSaveCounts') || '{}');
      if (Object.keys(saveCounts).length === 0) {
        const initialSaveCounts = {
          '1': 12,  // 첫사랑의 추억
          '2': 8,   // 이별의 순간
          '3': 18,  // 희망의 메시지
          '4': 5,   // 친구와의 갈등
          '5': 25   // 가족의 사랑
        };
        localStorage.setItem('scriptSaveCounts', JSON.stringify(initialSaveCounts));
      }
      
      // 5. 좋아요 수 로드
      loadLikeCount();
      
      // 6. 저장 수 로드
      loadSaveCount();
      
      // 7. 좋아요 상태 확인
      checkLikeStatus();
      
      // 8. 저장 상태 확인
      checkSaveStatus();
    })();
  }, [id, fetchScript, incrementViewCount, loadLikeCount, loadSaveCount, checkLikeStatus, checkSaveStatus]);

  // 로그인 상태 변경 시 좋아요 및 저장 상태 재확인
  useEffect(() => {
    checkLikeStatus();
    checkSaveStatus();
  }, [checkLikeStatus, checkSaveStatus, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || '대본을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/scripts')}
            className="btn-primary"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <Link
            to="/scripts"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Link>
        </div>

        {/* 대본 메타 정보 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">{script.title}</h1>
            
            <div className="flex items-center space-x-3">
              {/* 저장 버튼 */}
              <button
                onClick={handleSaveToggle}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isSaved
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-500'
                }`}
                title={isAuthenticated ? (isSaved ? '저장 취소' : '마이페이지에 저장') : '로그인이 필요합니다'}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                <span className="font-medium">{isSaved ? '저장됨' : '저장'}</span>
              </button>
              
              {/* 좋아요 버튼 */}
              <button
                onClick={handleLikeToggle}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                }`}
                title={isAuthenticated ? (isLiked ? '좋아요 취소' : '좋아요') : '로그인이 필요합니다'}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likeCount}</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">기본 정보</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-2" />
                  <span>등장인물: <strong>{script.characterCount}명</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <User className="w-5 h-5 mr-2" />
                  <span>성별: <strong>{script.gender || '미정'}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>길이: <strong>{script.duration || '미정'}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <User className="w-5 h-5 mr-2" />
                  <span>연령대: <strong>{script.ageGroup || '미정'}</strong></span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">분류 정보</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Palette className="w-5 h-5 mr-2" />
                  <span>분위기: <strong>{script.mood || '미정'}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Target className="w-5 h-5 mr-2" />
                  <span>사용목적: <strong>{script.purpose || '미정'}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>대본형태: <strong>{script.scriptType || '미정'}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>등록일: <strong>{new Date(script.createdAt).toLocaleDateString('ko-KR')}</strong></span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">통계 정보</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Eye className="w-5 h-5 mr-2" />
                  <span>조회수: <strong>{script.views}</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Heart className="w-5 h-5 mr-2 text-red-500" />
                  <span>좋아요: <strong>{likeCount}명</strong></span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Bookmark className="w-5 h-5 mr-2 text-emerald-500" />
                  <span>저장: <strong>{saveCount}명</strong></span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">감정 태그</h3>
              <div className="flex flex-wrap mb-4">
                {script.emotions?.map((emotion, index) => (
                  <Link
                    key={index}
                    to={`/scripts?emotion=${encodeURIComponent(emotion)}`}
                    className="emotion-tag hover:bg-primary-100 hover:text-primary-700 transition duration-200"
                  >
                    #{emotion}
                  </Link>
                ))}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">작가 정보</h3>
              <div className="text-gray-600">
                <p><strong>{script.author?.name || '익명'}</strong></p>
                <p className="text-sm">@{script.author?.username || 'anonymous'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 상황 설명 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">상황 설명</h2>
          <p className="text-gray-700 leading-relaxed text-lg">
            {script.situation}
          </p>
        </div>

        {/* 대본 내용 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">대본 내용</h2>
          <div className="bg-gray-50 rounded-lg p-6 max-h-96 md:max-h-none overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-lg overflow-x-auto">
              {script.content}
            </pre>
          </div>
        </div>

        {/* 관련 대본 */}
        {relatedScripts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Heart className="w-6 h-6 text-red-500 mr-3" />
              <h2 className="text-2xl font-bold text-gray-800">관련 대본</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedScripts.map((relatedScript) => (
                <RelatedScriptCard key={relatedScript._id} script={relatedScript} />
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-center space-x-4">
          <Link
            to="/scripts"
            className="btn-secondary"
          >
            다른 대본 보기
          </Link>
          
          <Link
            to="/add-script"
            className="btn-primary"
          >
            새 대본 등록
          </Link>
        </div>
      </div>
    </div>
  );
};

// 관련 대본 카드 컴포넌트
const RelatedScriptCard = ({ script }) => {
  // 좋아요 수 가져오기
  const getLikeCount = (scriptId) => {
    const likeCounts = JSON.parse(localStorage.getItem('scriptLikeCounts') || '{}');
    return likeCounts[scriptId] || 0;
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        {script.title}
      </h3>
      
      <div className="flex items-center text-sm text-gray-600 mb-3 flex-wrap gap-4">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{script.characterCount}명</span>
        </div>
        
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-1" />
          <span>{script.views}</span>
        </div>
        
        <div className="flex items-center">
          <Heart className="w-4 h-4 mr-1 text-red-500" />
          <span>{getLikeCount(script._id)}</span>
        </div>
      </div>
      
      <div className="mb-4">
        {script.emotions?.slice(0, 3).map((emotion, index) => (
          <span key={index} className="emotion-tag">
            #{emotion}
          </span>
        ))}
        {script.emotions?.length > 3 && (
          <span className="emotion-tag">+{script.emotions.length - 3}</span>
        )}
      </div>
      
      <Link
        to={`/scripts/${script._id}`}
        className="btn-primary inline-block text-center w-full text-sm"
      >
        자세히 보기
      </Link>
    </div>
  );
};

export default ScriptDetail; 