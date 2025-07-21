import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Heart, Settings, Eye, Calendar, Users, Bookmark, Sparkles, Palette, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MyPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedScripts, setSavedScripts] = useState([]);
  const [aiGeneratedScripts, setAiGeneratedScripts] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // 저장된 대본 불러오기
        const storedScripts = localStorage.getItem('savedScripts');
        const scripts = storedScripts ? JSON.parse(storedScripts) : [];
        setSavedScripts(scripts);

        // AI 생성 대본 불러오기
        const storedAIScripts = localStorage.getItem('aiGeneratedScripts');
        const aiScripts = storedAIScripts ? JSON.parse(storedAIScripts) : [];
        setAiGeneratedScripts(aiScripts);

      } catch (error) {
        console.error('데이터 로드 중 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 저장 제거 핸들러
  const handleRemoveSave = (scriptId) => {
    const updatedScripts = savedScripts.filter(script => script._id !== scriptId);
    setSavedScripts(updatedScripts);
    localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));
  };

  // AI 생성 대본 제거 핸들러
  const handleRemoveAIScript = (scriptId) => {
    const updatedScripts = aiGeneratedScripts.filter(script => script._id !== scriptId);
    setAiGeneratedScripts(updatedScripts);
    localStorage.setItem('aiGeneratedScripts', JSON.stringify(updatedScripts));
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
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
                    <p className="text-2xl font-bold text-emerald-600">{savedScripts.length}개</p>
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
                    >
                      대본 둘러보기 →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedScripts.map((script) => (
                      <div key={script._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{script.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              저장일: {new Date(script.savedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <button
                              onClick={() => handleRemoveSave(script._id)}
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
                              onClick={() => handleRemoveAIScript(script._id)}
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