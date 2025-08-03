import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Eye, MessageCircle, Heart, Bookmark, Edit, Trash2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  actorProfileAPI, 
  actorRecruitmentAPI, 
  modelRecruitmentAPI, 
  communityPostAPI,
  likeAPI,
  bookmarkAPI 
} from '../services/api';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boardType, setBoardType] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // boardType을 백엔드 postType enum으로 변환
  const mapBoardTypeToPostType = (boardType) => {
    const mapping = {
      'actor-profile': 'actor_profile',
      'actor-recruitment': 'actor_recruitment',
      'model-recruitment': 'model_recruitment',
      'community': 'community_post',
      'actor-info': 'actor_info'
    };
    return mapping[boardType] || boardType;
  };

  // 게시판별 뒤로가기 경로
  const getBackPath = (board) => {
    switch (board) {
      case 'actor-recruitment': return '/actor-recruitment';
      case 'model-recruitment': return '/model-recruitment';
      case 'actor-info': 
      case 'community': return '/actor-info';
      case 'actor-profile': return '/actor-profile';
      default: return '/';
    }
  };

  // 게시판별 API 호출
  const fetchPostByType = async (postId) => {
    const apis = [
      { api: actorProfileAPI, type: 'actor-profile' },
      { api: actorRecruitmentAPI, type: 'actor-recruitment' },
      { api: modelRecruitmentAPI, type: 'model-recruitment' },
      { api: communityPostAPI, type: 'community' }
    ];

    for (const { api, type } of apis) {
      try {
        console.log(`🔍 ${type} API에서 게시글 ${postId} 조회 시도`);
        const response = await api.getById(postId);
        
        if (response.data.success && response.data.data) {
          console.log(`✅ ${type}에서 게시글 발견:`, response.data.data);
          setBoardType(type);
          return response.data.data;
        }
      } catch (error) {
        console.log(`❌ ${type} API 조회 실패:`, error.message);
        // 404는 정상적인 상황이므로 에러로 처리하지 않음
        continue;
      }
    }
    
    throw new Error('모든 게시판에서 게시글을 찾을 수 없습니다.');
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log('📄 게시글 상세 조회 시작:', id);
        
        // ID가 없는 경우 에러 처리
        if (!id || id === 'undefined') {
          throw new Error('유효하지 않은 게시글 ID입니다.');
        }

        // URL에서 boardType 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search);
        const urlBoardType = urlParams.get('boardType');
        
        let postData;
        if (urlBoardType) {
          // boardType이 지정된 경우 해당 API만 호출
          console.log('🎯 지정된 boardType으로 직접 조회:', urlBoardType);
          const apis = {
            'actor-profile': actorProfileAPI,
            'actor-recruitment': actorRecruitmentAPI,
            'model-recruitment': modelRecruitmentAPI,
            'community': communityPostAPI
          };
          
          const api = apis[urlBoardType];
          if (api) {
            try {
              const response = await api.getById(id);
              if (response.data.success && response.data.data) {
                postData = response.data.data;
                setBoardType(urlBoardType);
              } else {
                throw new Error(`${urlBoardType}에서 게시글을 찾을 수 없습니다.`);
              }
            } catch (error) {
              throw new Error(`${urlBoardType} 게시글 조회 실패: ${error.message}`);
            }
          } else {
            throw new Error('지원하지 않는 게시판 타입입니다.');
          }
        } else {
          // boardType이 없는 경우 기존 방식으로 모든 API 시도
          postData = await fetchPostByType(id);
        }
        
        setPost(postData);
        
        // 좋아요와 북마크 상태 확인 (로그인된 경우만)
        if (isAuthenticated && postData) {
          const postType = mapBoardTypeToPostType(boardType);
          
          try {
            const [likeStatus, bookmarkStatus] = await Promise.all([
              likeAPI.getStatus(postData._id, postType).catch(err => {
                console.log('좋아요 상태 확인 실패:', err);
                return { data: { isLiked: false } };
              }),
              bookmarkAPI.getStatus(postData._id, postType).catch(err => {
                console.log('북마크 상태 확인 실패:', err);
                return { data: { isBookmarked: false } };
              })
            ]);
            
            setIsLiked(likeStatus.data.isLiked || false);
            setIsBookmarked(bookmarkStatus.data.isBookmarked || false);
          } catch (error) {
            console.log('상태 확인 중 오류:', error);
            // 오류 발생 시 기본값으로 설정
            setIsLiked(false);
            setIsBookmarked(false);
          }
        } else {
          // 로그인하지 않은 경우 기본값으로 설정
          setIsLiked(false);
          setIsBookmarked(false);
        }
        
      } catch (error) {
        console.error('❌ 게시글 조회 실패:', error);
        toast.error('게시글을 불러올 수 없습니다: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, isAuthenticated, boardType]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    try {
      const postType = mapBoardTypeToPostType(boardType);
      const response = await likeAPI.toggle(post._id, postType);
      
      if (response.data.success) {
        const newIsLiked = response.data.isLiked;
        const newLikeCount = response.data.likeCount;
        
        setIsLiked(newIsLiked);
        setPost(prev => ({
          ...prev,
          likes: newLikeCount
        }));
        
        // 상태 변경을 localStorage에 저장하여 다른 페이지와 공유
        const likeStatusKey = `like_${post._id}_${mapBoardTypeToPostType(boardType)}`;
        if (newIsLiked) {
          localStorage.setItem(likeStatusKey, 'true');
        } else {
          localStorage.removeItem(likeStatusKey);
        }
        
        // 다른 탭/창에 상태 변경 알림
        window.dispatchEvent(new CustomEvent('likeStatusChanged', {
          detail: { postId: post._id, postType: mapBoardTypeToPostType(boardType), isLiked: newIsLiked, likeCount: newLikeCount }
        }));
        
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    const willBeBookmarked = !isBookmarked;
    const currentBookmarkCount = post.bookmarks || 0;
    const newBookmarkCount = willBeBookmarked ? currentBookmarkCount + 1 : currentBookmarkCount - 1;
    
    // UI를 먼저 업데이트
    setIsBookmarked(willBeBookmarked);
    setPost(prev => ({
      ...prev,
      bookmarks: Math.max(0, newBookmarkCount) // 음수 방지
    }));
    
    try {
      const postType = mapBoardTypeToPostType(boardType);
      console.log('🔍 북마크 API 호출:', {
        postId: post._id,
        boardType: boardType,
        postType: postType,
        expectedResult: willBeBookmarked
      });
      
      const response = await bookmarkAPI.toggle(post._id, postType);
      console.log('✅ 북마크 API 응답:', response.data);
      
      if (response.data.success) {
        // 서버 응답으로 최종 확인 및 동기화
        const serverIsBookmarked = response.data.isBookmarked;
        const serverBookmarkCount = response.data.bookmarkCount;
        
        // 예상과 다른 경우에만 다시 업데이트
        if (serverIsBookmarked !== willBeBookmarked || serverBookmarkCount !== newBookmarkCount) {
          console.log('🔄 서버 응답과 불일치, 동기화 중:', {
            expected: { bookmarked: willBeBookmarked, count: newBookmarkCount },
            server: { bookmarked: serverIsBookmarked, count: serverBookmarkCount }
          });
          
          setIsBookmarked(serverIsBookmarked);
          setPost(prev => ({
            ...prev,
            bookmarks: serverBookmarkCount
          }));
        }
        
        // 최종 상태를 localStorage에 저장
        const bookmarkStatusKey = `bookmark_${post._id}_${mapBoardTypeToPostType(boardType)}`;
        const finalIsBookmarked = serverIsBookmarked !== undefined ? serverIsBookmarked : willBeBookmarked;
        const finalBookmarkCount = serverBookmarkCount !== undefined ? serverBookmarkCount : newBookmarkCount;
        
        if (finalIsBookmarked) {
          localStorage.setItem(bookmarkStatusKey, 'true');
        } else {
          localStorage.removeItem(bookmarkStatusKey);
        }
        
        // 다른 탭/창에 상태 변경 알림
        window.dispatchEvent(new CustomEvent('bookmarkStatusChanged', {
          detail: { postId: post._id, postType: mapBoardTypeToPostType(boardType), isBookmarked: finalIsBookmarked, bookmarkCount: finalBookmarkCount }
        }));
        
        toast.success(response.data.message || (finalIsBookmarked ? '저장되었습니다!' : '저장을 취소했습니다!'));
      }
    } catch (error) {
      // 오류 발생 시 UI 롤백
      console.error('❌ 북마크 오류, UI 롤백:', error);
      setIsBookmarked(!willBeBookmarked);
      setPost(prev => ({
        ...prev,
        bookmarks: currentBookmarkCount
      }));
      
      toast.error('북마크 처리 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = () => {
    // 게시판별 수정 페이지로 이동
    const editPaths = {
      'actor-profile': `/posts/new?board=actor-profile&edit=${post._id}`,
      'actor-recruitment': `/posts/new?board=actor-recruitment&edit=${post._id}`,
      'model-recruitment': `/posts/new?board=model-recruitment&edit=${post._id}`,
      'community': `/posts/new?board=community&edit=${post._id}`
    };
    
    const editPath = editPaths[boardType];
    if (editPath) {
      navigate(editPath);
    } else {
      toast.error('해당 게시판의 수정 기능은 지원하지 않습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const apis = {
        'actor-profile': actorProfileAPI,
        'actor-recruitment': actorRecruitmentAPI,
        'model-recruitment': modelRecruitmentAPI,
        'community': communityPostAPI
      };

      const api = apis[boardType];
      if (!api) {
        throw new Error('지원하지 않는 게시판 타입입니다.');
      }

      console.log('🗑️ 게시글 삭제 시도:', { postId: post._id, boardType });
      const response = await api.delete(post._id);
      
      console.log('🔍 삭제 API 응답 구조 확인:', {
        response: response,
        responseData: response.data,
        responseSuccess: response.success,
        responseDataSuccess: response.data?.success
      });
      
      // API 응답 구조 확인 (response.data.success 또는 response.success)
      const success = response.data?.success || response.success;
      
      if (success) {
        toast.success('게시글이 삭제되었습니다.');
        
        // 대본함에서 온 경우 대본함으로 돌아가기
        const fromScriptVault = new URLSearchParams(location.search).get('from') === 'script-vault';
        if (fromScriptVault) {
          navigate('/script-vault');
        } else {
          navigate(getBackPath(boardType));
        }
      } else {
        const errorMessage = response.data?.message || response.message || '삭제에 실패했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 게시글 삭제 오류:', error);
      
      // 삭제가 실제로 성공했지만 응답 구조 문제로 오류가 발생한 경우를 위해
      // 404 오류이거나 "not found" 메시지가 있으면 삭제가 성공한 것으로 간주
      const isDeletedAlready = error.response?.status === 404 || 
                              error.message?.toLowerCase().includes('not found') ||
                              error.response?.data?.message?.toLowerCase().includes('not found');
      
      if (isDeletedAlready) {
        toast.success('게시글이 삭제되었습니다.');
        
        // 대본함에서 온 경우 대본함으로 돌아가기
        const fromScriptVault = new URLSearchParams(location.search).get('from') === 'script-vault';
        if (fromScriptVault) {
          navigate('/script-vault');
        } else {
          navigate(getBackPath(boardType));
        }
      } else {
        toast.error('게시글 삭제 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleBack = () => {
    // 대본함에서 온 경우 대본함으로 돌아가기
    const fromScriptVault = new URLSearchParams(location.search).get('from') === 'script-vault';
    if (fromScriptVault) {
      navigate('/script-vault');
    } else {
      navigate(getBackPath(boardType));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBoardName = (type) => {
    const names = {
      'actor-profile': '배우 프로필',
      'actor-recruitment': '배우 모집',
      'model-recruitment': '모델 모집',
      'community': '커뮤니티'
    };
    return names[type] || '게시판';
  };

  const getCategoryColor = (type) => {
    const colors = {
      'actor-profile': 'bg-purple-100 text-purple-700',
      'actor-recruitment': 'bg-blue-100 text-blue-700',
      'model-recruitment': 'bg-pink-100 text-pink-700',
      'community': 'bg-green-100 text-green-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">게시글을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">삭제되었거나 존재하지 않는 게시글입니다.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            목록으로 돌아가기
          </button>
        </div>

        {/* 게시글 내용 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 헤더 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(boardType)}`}>
                  {post.category || getBoardName(boardType)}
                </span>
                <span className="text-sm text-gray-500">
                  {getBoardName(boardType)}
                </span>
              </div>
              
              {/* 수정/삭제 버튼 (작성자만 보임) */}
              {isAuthenticated && (
                user?._id === post.userId?._id || 
                user?.id === post.userId?._id ||
                user?._id === post.userId ||
                user?.id === post.userId
              ) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </button>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {post.userId?.email || post.name || '익명'}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(post.createdAt)}
              </span>
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {post.views || 0}
              </span>
              {post.location && (
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {post.location}
                </span>
              )}
            </div>

            {/* 추가 정보 (모집 글인 경우) */}
            {(boardType === 'actor-recruitment' || boardType === 'model-recruitment') && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {post.projectType && (
                    <div>
                      <strong>프로젝트 유형:</strong> {post.projectType}
                    </div>
                  )}
                  {post.modelType && (
                    <div>
                      <strong>모델 유형:</strong> {post.modelType}
                    </div>
                  )}
                  {post.applicationMethod && (
                    <div>
                      <strong>지원방법:</strong> {post.applicationMethod}
                    </div>
                  )}
                  {post.contactInfo?.email && (
                    <div>
                      <strong>연락처:</strong> {post.contactInfo.email}
                    </div>
                  )}
                  {post.applicationDeadline && (
                    <div>
                      <strong>마감일:</strong> {formatDate(post.applicationDeadline)}
                    </div>
                  )}
                  {post.payment?.type && (
                    <div>
                      <strong>보수:</strong> {post.payment.type} 
                      {post.payment.amount && ` (${post.payment.amount.toLocaleString()}원)`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 배우 프로필 정보 */}
            {boardType === 'actor-profile' && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {post.gender && (
                    <div>
                      <strong>성별:</strong> {post.gender}
                    </div>
                  )}
                  {post.age && (
                    <div>
                      <strong>나이:</strong> {post.age}세
                    </div>
                  )}
                  {post.experience && (
                    <div>
                      <strong>경력:</strong> {post.experience}
                    </div>
                  )}
                  {post.height && (
                    <div>
                      <strong>키:</strong> {post.height}cm
                    </div>
                  )}
                  {post.weight && (
                    <div>
                      <strong>몸무게:</strong> {post.weight}kg
                    </div>
                  )}
                  {post.specialty && post.specialty.length > 0 && (
                    <div className="md:col-span-3">
                      <strong>전문분야:</strong> {post.specialty.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 이미지 */}
          {post.images && post.images.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4">첨부 이미지</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {post.images.map((image, index) => {
                  // Cloudinary URL 처리 - 간소화됨!
                  let imageUrl = image.url;
                  
                  // Cloudinary URL은 이미 완전한 URL이므로 그대로 사용
                  if (imageUrl.startsWith('https://res.cloudinary.com/')) {
                    console.log(`☁️ [PostDetail] Cloudinary URL 사용: ${imageUrl}`);
                  } 
                  // 기존 상대 URL 처리 (하위 호환성)
                  else if (imageUrl.startsWith('/uploads/')) {
                    const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin;
                    imageUrl = `${API_BASE_URL}${imageUrl}`;
                    console.log(`🔧 [PostDetail] 상대 URL 변환: ${imageUrl}`);
                  }
                  // 기타 절대 URL
                  else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                    console.log(`🌐 [PostDetail] 기타 절대 URL: ${imageUrl}`);
                  }
                  
                  return (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`첨부 이미지 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        console.log(`❌ [PostDetail] 이미지 ${index + 1} 로드 실패:`, {
                          originalSrc: imageUrl,
                          postId: post._id,
                          imageIndex: index
                        });
                        
                        // 여러 fallback 시도
                        const fallbackUrls = [
                          '/default-image-wide.svg',
                          '/api/placeholder/300/200',
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsnYw8L3RleHQ+PC9zdmc+'
                        ];
                        
                        const currentIndex = fallbackUrls.indexOf(e.target.src);
                        const nextIndex = currentIndex + 1;
                        
                        if (nextIndex < fallbackUrls.length) {
                          e.target.src = fallbackUrls[nextIndex];
                        }
                      }}
                      onLoad={() => {
                        console.log(`✅ [PostDetail] 이미지 ${index + 1} 로드 성공:`, imageUrl);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 본문 */}
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isLiked 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  좋아요 {post.likes || 0}
                </button>
                <button
                  onClick={handleBookmark}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isBookmarked 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                  저장하기 {post.bookmarks || 0}
                </button>
              </div>
              
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 