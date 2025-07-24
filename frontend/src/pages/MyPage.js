import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Heart, Settings, Eye, Calendar, Users, Bookmark, Sparkles, Palette, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  actorProfileAPI, 
  actorRecruitmentAPI, 
  modelRecruitmentAPI, 
  communityPostAPI,
  bookmarkAPI 
} from '../services/api';
import { toast } from 'react-hot-toast';

const MyPage = () => {
  const { 
    user, 
    isAuthenticated, 
    savedScripts, 
    aiGeneratedScripts, 
    loading,
    removeSavedScript,
    removeAIGeneratedScript
  } = useAuth();

  const [myPosts, setMyPosts] = useState([]);
  const [mySavedPosts, setMySavedPosts] = useState([]);

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

  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
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
        // 실패해도 빈 배열로 설정하여 에러 토스트는 표시하지 않음
      }
    };

    const fetchMySavedPosts = async () => {
      try {
        const response = await bookmarkAPI.getMyBookmarks();
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
              postData = { _id: actualPostId };
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
          
          console.log('✅ 저장한 글 처리 완료:', processedBookmarks);
          setMySavedPosts(processedBookmarks);
        }
      } catch (error) {
        console.error('저장한 글 불러오기 실패:', error);
        // 실패해도 빈 배열로 설정하여 에러 토스트는 표시하지 않음
      }
    };

    if (isAuthenticated) {
      fetchMyPosts();
      fetchMySavedPosts();
    }
  }, [isAuthenticated]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 페이지 헤더 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
                <p className="text-gray-600">안녕하세요, {user?.name || user?.username}님!</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 내 정보 섹션 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-emerald-600" />
                  내 정보
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">이름</label>
                    <p className="text-gray-900">{user?.name || user?.username || '설정되지 않음'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">이메일</label>
                    <p className="text-gray-900">{user?.email || '설정되지 않음'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">저장한 대본</label>
                    <p className="text-2xl font-bold text-emerald-600">{mySavedPosts.length}개</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">내가 작성한 글</label>
                    <p className="text-2xl font-bold text-blue-600">{myPosts.length}개</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">AI 생성 대본</label>
                    <p className="text-2xl font-bold text-purple-600">{aiGeneratedScripts.length}개</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 대본 섹션들 */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 내가 작성한 글 섹션 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-500" />
                  내가 작성한 글 ({myPosts.length})
                </h2>
                
                {myPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">아직 작성한 글이 없습니다.</p>
                    <Link 
                      to="/actor-recruitment" 
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      글 작성하기 →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myPosts.map((post) => (
                      <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBoardTypeColor(post.boardType)}`}>
                                {getBoardTypeName(post.boardType)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(post.createdAt)}
                              </span>
                            </div>
                            <Link 
                              to={`/posts/${post._id}`}
                              className="block"
                            >
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                                {post.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
                                {post.author && (
                                  <span className="text-xs text-gray-400">
                                    작성자: {post.author}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </div>
                          {/* 레이아웃 통일을 위한 빈 공간 (저장한 글의 삭제 버튼과 동일한 너비) */}
                          <div className="w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 저장한 글 섹션 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Bookmark className="w-5 h-5 mr-2 text-emerald-500" />
                  저장한 글 ({mySavedPosts.length})
                </h2>
                
                {mySavedPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">아직 저장한 글이 없습니다.</p>
                    <Link 
                      to="/actor-recruitment" 
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      게시판 둘러보기 →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mySavedPosts.map((post) => (
                      <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBoardTypeColor(post.boardType || post.board)}`}>
                                {getBoardTypeName(post.boardType || post.board)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(post.savedAt || post.createdAt)}
                              </span>
                            </div>
                            <Link 
                              to={`/posts/${post._id}`}
                              className="block"
                              onClick={(e) => {
                                // ID가 없거나 undefined면 링크 클릭 방지
                                if (!post._id || post._id === 'undefined' || post._id === undefined) {
                                  e.preventDefault();
                                  console.error('❌ 유효하지 않은 게시글 ID:', post._id);
                                  console.error('❌ 전체 post 객체:', post);
                                  toast.error('게시글 ID가 유효하지 않습니다.');
                                  return;
                                }
                                console.log('✅ 게시글로 이동:', post._id);
                              }}
                            >
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                                {post.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
                                {post.author && (
                                  <span className="text-xs text-gray-400">
                                    작성자: {post.author}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </div>
                          <button
                            onClick={() => removeSavedPost(post.bookmarkId)}
                            className="text-red-600 hover:text-red-700 text-sm ml-4 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI 생성 대본 섹션 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                  AI 생성 대본 ({aiGeneratedScripts.length})
                </h2>
                
                {aiGeneratedScripts.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">아직 AI로 생성한 대본이 없습니다.</p>
                    <Link 
                      to="/ai-script" 
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      AI 대본 생성하기 →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiGeneratedScripts.map((script) => (
                      <div key={script._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{script.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              생성일: {new Date(script.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <button
                              onClick={() => removeAIGeneratedScript(script._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage; 