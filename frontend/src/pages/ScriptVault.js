import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, 
  Sparkles, 
  Calendar, 
  Users, 
  Film, 
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
import api from '../services/api';
import { toast } from 'react-hot-toast';

const ScriptVault = () => {
  const { 
    aiGeneratedScripts, 
    loadAIGeneratedScripts, 
    removeAIGeneratedScript,
    isAuthenticated
  } = useAuth();
  
  const navigate = useNavigate();
  const [selectedScript, setSelectedScript] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [editedMemo, setEditedMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 인증되지 않은 사용자 리다이렉트
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // AI 생성 스크립트 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadAIGeneratedScripts();
    }
  }, [isAuthenticated, loadAIGeneratedScripts]);

  // 메모 저장
  const saveMemo = async () => {
    if (!selectedScriptId) return;
    
    setIsSavingMemo(true);
    try {
      const response = await api.put(`/ai-script/scripts/${selectedScriptId}/memo`, {
        memo: editedMemo
      });

      if (response.data.success) {
        setSelectedMemo(editedMemo);
        setIsEditingMemo(false);
        toast.success('메모가 저장되었습니다.');
      } else {
        throw new Error(response.data.message || '메모 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('메모 저장 오류:', error);
      toast.error(error.response?.data?.message || '메모 저장에 실패했습니다.');
    } finally {
      setIsSavingMemo(false);
    }
  };

  // 메모 로드
  const loadMemo = async (scriptId) => {
    try {
      const response = await api.get(`/ai-script/scripts/${scriptId}/memo`);
      if (response.data.success) {
        setSelectedMemo(response.data.memo);
        setEditedMemo(response.data.memo);
      }
    } catch (error) {
      console.error('메모 로드 오류:', error);
      setSelectedMemo('');
      setEditedMemo('');
    }
  };

  // 스크립트 복사
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('클립보드에 복사되었습니다!');
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
      toast.error('클립보드 복사에 실패했습니다.');
    });
  };

  // 스크립트 삭제
  const handleDeleteScript = async (scriptId) => {
    if (window.confirm('정말로 이 대본을 삭제하시겠습니까?')) {
      try {
        await removeAIGeneratedScript(scriptId);
        toast.success('대본이 삭제되었습니다.');
      } catch (error) {
        console.error('대본 삭제 오류:', error);
        toast.error('대본 삭제에 실패했습니다.');
      }
    }
  };

  // 상세 모달 열기
  const openDetailModal = (script) => {
    setSelectedScript(script);
    setShowDetailModal(true);
  };

  // 메모 모달 열기
  const openMemoModal = async (script) => {
    setSelectedScript(script);
    setSelectedScriptId(script.id);
    setShowMemoModal(true);
    await loadMemo(script.id);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setShowMemoModal(false);
    setSelectedScript(null);
    setSelectedScriptId(null);
    setIsEditingMemo(false);
    setSelectedMemo('');
    setEditedMemo('');
  };

  // 스크립트 필터링
  const filteredScripts = aiGeneratedScripts.filter(script => {
    if (!searchTerm) return true;
    return script.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           script.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           script.genre?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // AI 스크립트 카드 렌더링
  const renderScriptCard = (script) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    };

    return (
      <motion.div
        key={script.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  AI 생성
                </span>
                {script.genre && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {script.genre}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                {script.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{script.characterCount}명</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(script.createdAt)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => openDetailModal(script)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              보기
            </button>
            <button
              onClick={() => copyToClipboard(script.content)}
              className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              복사
            </button>
            <button
              onClick={() => openMemoModal(script)}
              className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              메모
            </button>
            <button
              onClick={() => handleDeleteScript(script.id)}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 lg:px-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Archive className="w-8 h-8 text-purple-600" />
              내 대본함
            </h1>
            <p className="text-gray-600 mt-2">
              AI로 생성한 대본들을 관리하고 메모를 남길 수 있습니다.
            </p>
          </div>
        </div>

        {/* 검색 */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="제목, 내용, 장르로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* AI 생성 스크립트 목록 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              AI 생성 대본
            </h2>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {filteredScripts.length}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          ) : filteredScripts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm ? '검색 결과가 없습니다.' : 'AI로 생성한 대본이 없습니다.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/ai-script')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  대본 생성하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredScripts.map(script => renderScriptCard(script))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 상세 보기 모달 */}
        <AnimatePresence>
          {showDetailModal && selectedScript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedScript.title}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-mono">
                    {selectedScript.content}
                  </pre>
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => copyToClipboard(selectedScript.content)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    복사
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 메모 모달 */}
        <AnimatePresence>
          {showMemoModal && selectedScript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-yellow-500" />
                    메모
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {isEditingMemo ? (
                    <>
                      <textarea
                        value={editedMemo}
                        onChange={(e) => setEditedMemo(e.target.value)}
                        placeholder="메모를 입력하세요..."
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={saveMemo}
                          disabled={isSavingMemo}
                          className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSavingMemo ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              저장
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingMemo(false);
                            setEditedMemo(selectedMemo);
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-h-[8rem] p-3 bg-gray-50 rounded-lg">
                        {selectedMemo ? (
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedMemo}</p>
                        ) : (
                          <p className="text-gray-500 italic">메모가 없습니다.</p>
                        )}
                      </div>
                      <button
                        onClick={() => setIsEditingMemo(true)}
                        className="w-full mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        메모 편집
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScriptVault;