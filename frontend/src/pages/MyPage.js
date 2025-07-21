import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Heart, Settings, Eye, Calendar, Users, Bookmark, Sparkles, Palette, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MyPage = () => {
  const { 
    user, 
    isAuthenticated, 
    savedScripts, 
    loadSavedScripts, 
    removeSavedScript,
    aiGeneratedScripts,
    loadAIGeneratedScripts,
    removeAIGeneratedScript
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);

  // 저장한 대본 데이터 로드
  useEffect(() => {
    if (isAuthenticated && !dataInitialized) {
      // 더미 데이터가 없으면 추가 (테스트용)
      const stored = localStorage.getItem('savedScripts');
      if (!stored || JSON.parse(stored).length === 0) {
        const dummySavedScripts = [
          {
            _id: '1',
            title: '첫사랑의 추억',
            characterCount: 2,
            views: 1250,
            emotions: ['그리움', '사랑'],
            createdAt: '2024-01-15',
            savedAt: '2024-01-20'
          },
          {
            _id: '3',
            title: '희망의 메시지',
            characterCount: 1,
            views: 750,
            emotions: ['희망', '기쁨'],
            createdAt: '2024-01-05',
            savedAt: '2024-01-12'
          }
        ];
        localStorage.setItem('savedScripts', JSON.stringify(dummySavedScripts));
      }
      
      loadSavedScripts();
      loadAIGeneratedScripts();
      setDataInitialized(true);
      setTimeout(() => setLoading(false), 500);
    } else if (isAuthenticated && dataInitialized) {
      setLoading(false);
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, dataInitialized, loadSavedScripts, loadAIGeneratedScripts]);

  // 저장 제거 핸들러
  const handleRemoveSave = (scriptId) => {
    console.log('저장 제거:', scriptId);
    removeSavedScript(scriptId);
  };

  // 디버깅용 로그
  console.log('MyPage 렌더링:', { 
    isAuthenticated, 
    loading, 
    dataInitialized,
    savedScriptsCount: savedScripts.length,
    user: user?.name 
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">마이페이지를 이용하려면 먼저 로그인해주세요.</p>
          <Link to="/login" className="btn btn-primary">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-4 text-secondary">로딩 중...</p>
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
              <button className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                <Settings className="w-5 h-5" />
                <span>설정</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 내 정보 섹션 */}
            <div className="lg:col-span-1 space-y-8">
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
                    <label className="text-sm font-medium text-gray-500">가입일</label>
                    <p className="text-gray-900">
                      {user?.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('ko-KR')
                        : '2024년 1월 1일'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">저장한 대본</label>
                    <p className="text-2xl font-bold text-emerald-600">{savedScripts.length}개</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">AI 생성 대본</label>
                    <p className="text-2xl font-bold text-purple-600">{aiGeneratedScripts.length}개</p>
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <button className="w-full px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                    프로필 수정
                  </button>
                  
                  {/* 디버깅용 테스트 버튼들 */}
                  <div className="text-xs text-gray-500 border-t pt-2">
                    <p>라우팅 테스트:</p>
                    <div className="flex gap-2 mt-2">
                      <Link to="/" className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                        홈
                      </Link>
                      <Link to="/scripts" className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">
                        대본목록
                      </Link>
                      <button 
                        onClick={() => {
                          console.log('현재 상태:', { isAuthenticated, user, loading });
                          alert('라우팅 테스트 - 콘솔을 확인하세요');
                        }}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs"
                      >
                        상태확인
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 대본 섹션들 */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 저장한 대본 섹션 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Bookmark className="w-5 h-5 mr-2 text-emerald-500" />
                  저장한 대본 ({savedScripts.length})
                </h2>
                
                {savedScripts.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">아직 저장한 대본이 없습니다.</p>
                    <Link 
                      to="/scripts" 
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                      onClick={() => console.log('대본 둘러보기 클릭됨')}
                    >
                      대본 둘러보기 →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedScripts.map((script) => (
                      <div key={script._id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>{new Date(script.createdAt).toLocaleDateString('ko-KR')}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {script.emotions?.map((emotion, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  #{emotion}
                                </span>
                              ))}
                            </div>
                            
                            <p className="text-xs text-gray-500">
                              {new Date(script.savedAt).toLocaleDateString('ko-KR')}에 저장 추가
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <button 
                              onClick={() => handleRemoveSave(script._id)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="저장 취소"
                            >
                              <Bookmark className="w-4 h-4 fill-current" />
                            </button>
                            <Link 
                              to={`/scripts/${script._id}`}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                              onClick={() => console.log('스크립트 보기 클릭됨:', script._id)}
                            >
                              보기
                            </Link>
                          </div>
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
                      <div key={script._id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {script.title}
                              </h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI 생성
                              </span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600 mb-3 flex-wrap gap-4">
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{script.characterCount}명</span>
                              </div>
                              
                              <div className="flex items-center">
                                <Palette className="w-4 h-4 mr-1" />
                                <span>{script.genre}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <Heart className="w-4 h-4 mr-1" />
                                <span>{script.emotion}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{script.length}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>{new Date(script.generatedAt).toLocaleDateString('ko-KR')}</span>
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {script.content.length > 200 
                                  ? script.content.substring(0, 200) + '...' 
                                  : script.content
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <button 
                              onClick={() => removeAIGeneratedScript(script._id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(script.content);
                                alert('대본이 클립보드에 복사되었습니다!');
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                            >
                              복사
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