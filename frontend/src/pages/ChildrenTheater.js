import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Check, 
  Copy, 
  Archive, 
  Edit3, 
  RefreshCw,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ChildrenTheater = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 상태 관리
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedLength, setSelectedLength] = useState('medium');
  const [showAnimalSelection, setShowAnimalSelection] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');
  const [usageData, setUsageData] = useState({
    used: 0,
    limit: null,
    isPremium: false,
    canGenerate: true,
    daysUntilReset: 0
  });

  // 테마 데이터
  const childrenThemes = [
    {
      value: 'animal-friends',
      label: '동물 친구들',
      description: '다양한 동물 캐릭터들이 등장하는 교육적이고 재미있는 연극',
      genre: '어린이 동물 연극',
      icon: '🐰',
      color: 'from-green-400 to-blue-500'
    },
    {
      value: 'fairy-tale',
      label: '동화 속 이야기',
      description: '전래동화나 창작동화를 바탕으로 한 상상력 넘치는 연극',
      genre: '어린이 동화 연극',
      icon: '🏰',
      color: 'from-purple-400 to-pink-500'
    },
    {
      value: 'friendship',
      label: '우정과 협력',
      description: '친구들과의 우정, 협력, 갈등 해결을 다루는 교육적 연극',
      genre: '어린이 교육 연극',
      icon: '🤝',
      color: 'from-yellow-400 to-orange-500'
    }
  ];

  // 동물 캐릭터 데이터
  const availableAnimals = [
    { value: 'rabbit', label: '토끼', icon: '🐰', personality: '활발하고 친근한', voiceStyle: '밝고 경쾌한' },
    { value: 'bear', label: '곰', icon: '🐻', personality: '온화하고 든든한', voiceStyle: '따뜻하고 안정감 있는' },
    { value: 'fox', label: '여우', icon: '🦊', personality: '영리하고 재치있는', voiceStyle: '똑똑하고 재빠른' },
    { value: 'cat', label: '고양이', icon: '🐱', personality: '우아하고 독립적인', voiceStyle: '부드럽고 우아한' },
    { value: 'dog', label: '강아지', icon: '🐶', personality: '충실하고 활기찬', voiceStyle: '밝고 열정적인' },
    { value: 'pig', label: '돼지', icon: '🐷', personality: '순수하고 정직한', voiceStyle: '순진하고 솔직한' }
  ];

  // 길이 옵션
  const lengths = [
    { value: 'short', label: '짧은 대본 (1-3분)' },
    { value: 'medium', label: '중간 길이 (3-5분)' },
    { value: 'long', label: '긴 대본 (5-10분)' }
  ];

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      const response = await api.get('/admin/usage');
      if (response.data) {
        setUsageData(response.data);
      }
    } catch (error) {
      console.error('사용량 정보 조회 실패:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsageInfo();
    }
  }, [user]);

  // 테마 선택 처리
  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme);
    if (theme.value === 'animal-friends') {
      setShowAnimalSelection(true);
    }
  };

  // 동물 선택/해제 처리
  const handleAnimalToggle = (animal) => {
    setSelectedAnimals(prev => {
      const exists = prev.find(a => a.value === animal.value);
      if (exists) {
        return prev.filter(a => a.value !== animal.value);
      } else if (prev.length < 6) {
        return [...prev, { ...animal, percentage: 0 }];
      }
      return prev;
    });
  };

  // 대본 생성
  const handleGenerate = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!usageData.canGenerate) {
      toast.error(`이번 달 사용량 한도를 초과했습니다.`);
      return;
    }

    if (selectedAnimals.length === 0) {
      setError('최소 1마리의 동물을 선택해주세요.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedScript('');
    setProgress(0);

    try {
      // 테마별 프롬프트 생성 (간단한 예시)
      const themePrompt = `${selectedTheme.description}을 바탕으로 ${selectedAnimals.map(a => a.label).join(', ')}이 등장하는 ${lengths.find(l => l.value === selectedLength)?.label} 어린이 연극 대본을 작성해주세요.`;
      
      setFinalPrompt(themePrompt);

      const requestData = {
        template: 'children',
        theme: selectedTheme.value,
        themePrompt: themePrompt,
        characterCount: selectedAnimals.length.toString(),
        characters: selectedAnimals,
        length: selectedLength,
        genre: selectedTheme.genre
      };

      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setProgress(Math.min(currentProgress, 90));
      }, 500);

      const response = await api.post('/children-theater/generate', requestData);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (response.data && response.data.script) {
        const scriptContent = response.data.script.content || response.data.script;
        setGeneratedScript(scriptContent);
        toast.success('🎭 어린이 연극 대본이 생성되었습니다!');
        
        setTimeout(() => {
          setProgress(0);
          fetchUsageInfo();
        }, 1000);
      }
    } catch (error) {
      console.error('대본 생성 오류:', error);
      setError('대본 생성 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  // 간단한 스크립트 파싱 (실제로는 더 복잡한 파싱 로직 필요)
  const parseAndRenderScript = (script) => {
    return <pre className="whitespace-pre-wrap font-sans">{script}</pre>;
  };

  // 텍스트 선택 핸들러 (리라이팅 기능용)
  const handleTextSelection = () => {
    // 리라이팅 기능 구현 필요
  };

  // 메모 모달 열기
  const openMemoModal = () => {
    toast.info('메모 기능은 곧 추가될 예정입니다.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/ai-script')}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>템플릿 선택으로 돌아가기</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                🎭 어린이 연극 대본
              </h1>
              <p className="text-lg text-gray-600">
                교육적이고 재미있는 어린이 연극 대본을 AI로 생성하세요
              </p>
            </div>
            
            <div className="w-32"></div> {/* 공간 확보용 */}
          </div>

          {/* 사용량 표시 바 */}
          <div className={`bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 ${
            usageData.isPremium ? 'border-green-500' : 'border-blue-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`w-5 h-5 ${
                    usageData.isPremium ? 'text-green-600' : 'text-blue-600'
                  }`} />
                  <span className="font-medium text-gray-900">
                    {usageData.isPremium ? '무제한 플랜' : '베타 테스트 플랜'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {usageData.limit === null || usageData.limit === '무제한' ? 
                    `${usageData.used}회 사용 (무제한)` :
                    `${usageData.used}/${usageData.limit}회 사용`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* 테마 선택 */}
          {!showAnimalSelection && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">연극 테마를 선택하세요</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {childrenThemes.map((theme) => (
                  <motion.div
                    key={theme.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleThemeSelect(theme)}
                    className={`bg-gradient-to-r ${theme.color} rounded-xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300`}
                  >
                    <div className="text-center">
                      <div className="text-6xl mb-4">{theme.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{theme.label}</h3>
                      <p className="text-sm opacity-90">{theme.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 동물 선택 (동물 친구들 테마일 때) */}
          {showAnimalSelection && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* 뒤로가기 버튼 */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowAnimalSelection(false);
                    setSelectedAnimals([]);
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>테마 다시 선택</span>
                </button>
              </div>

              {/* 동물 선택 그리드 */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">동물 캐릭터를 선택하세요</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
                  {availableAnimals.map((animal) => {
                    const isSelected = selectedAnimals.some(a => a.value === animal.value);
                    return (
                      <motion.div
                        key={animal.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAnimalToggle(animal)}
                        className={`bg-white rounded-xl shadow-md border-2 p-4 cursor-pointer transition-all duration-300 ${
                          isSelected 
                            ? 'border-green-400 bg-green-50 shadow-lg' 
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="text-center space-y-2">
                          <div className="text-4xl mb-2">{animal.icon}</div>
                          <div className="font-semibold text-gray-900 text-sm">{animal.label}</div>
                          <div className="text-xs text-gray-500">{animal.personality}</div>
                          {isSelected && (
                            <div className="flex items-center justify-center">
                              <Check className="w-5 h-5 text-green-600" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* 길이 선택 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">대본 길이</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {lengths.map((length) => (
                      <button
                        key={length.value}
                        onClick={() => setSelectedLength(length.value)}
                        className={`p-3 rounded-lg border transition-colors ${
                          selectedLength === length.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {length.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 생성 버튼 */}
                <div className="text-center">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedAnimals.length === 0}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isGenerating ? '대본 생성 중...' : '🎭 대본 생성하기'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 진행바 */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">🎭 어린이 연극 대본 생성 중...</h3>
                <p className="text-gray-600 mt-2">AI가 창의적인 대본을 작성하고 있어요</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="text-center text-sm text-gray-500">
                {progress.toFixed(0)}% 완료
              </div>
            </motion.div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6"
            >
              <p className="text-red-700">{error}</p>
            </motion.div>
          )}

          {/* 생성된 대본 결과 */}
          {generatedScript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">🎭 어린이 연극 대본 생성 완료!</h2>
                <p className="text-gray-600">생성된 대본을 확인하고 연습에 활용해보세요.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-800">🐰 {selectedTheme?.label} 연극 대본</h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                      {selectedAnimals.length}마리
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                      어린이 연극
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-700 rounded-full">
                      {selectedTheme?.label}
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-orange-100 text-orange-700 rounded-full">
                      {lengths.find(l => l.value === selectedLength)?.label}
                    </span>
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start sm:items-center text-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다</span>
                  </div>
                </div>
                
                <div 
                  className="bg-white rounded-lg p-3 sm:p-4 md:p-6 border border-gray-200 max-h-[60vh] overflow-y-auto cursor-text select-text text-sm sm:text-base leading-relaxed"
                  onMouseUp={handleTextSelection}
                >
                  {parseAndRenderScript(generatedScript)}
                </div>
              </div>

              {/* 입력된 최종 프롬프트 섹션 */}
              {finalPrompt && (
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">입력된 최종 프롬프트</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(finalPrompt);
                        toast.success('프롬프트가 클립보드에 복사되었습니다!');
                      }}
                      className="flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      복사
                    </button>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 max-h-80 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-700 font-mono leading-relaxed">
                      {finalPrompt}
                    </pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedScript);
                    toast.success('대본이 클립보드에 복사되었습니다!');
                  }}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  복사
                </button>
                <button
                  onClick={() => navigate('/script-vault')}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">대본함</span>
                  <span className="sm:hidden">함</span>
                </button>
                <button
                  onClick={openMemoModal}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">📝 메모</span>
                  <span className="sm:hidden">메모</span>
                </button>
                <button
                  onClick={() => {
                    setGeneratedScript('');
                    setFinalPrompt('');
                    setError('');
                    setSelectedAnimals([]);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  다시 생성
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildrenTheater;