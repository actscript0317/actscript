import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wand2, RefreshCw, Copy, Save, Archive, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ScriptRenderer from '../../components/common/ScriptRenderer';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ChildrenThemeSelection = ({ childrenThemes, onThemeSelect, onBack, usageData = {} }) => {
  const { addSavedScript, user } = useAuth();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');

  // 대본 길이 옵션
  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분 (약 12~16줄)', icon: '⚡', available: true },
    { value: 'medium', label: '중간', time: '3~5분 (약 25~35줄)', icon: '⏱️', available: true },
    { value: 'long', label: '길게', time: '5~10분 (약 50~70줄)', icon: '📝', available: true }
  ];

  const handleThemeClick = (theme) => {
    setSelectedTheme(theme);
    
    // 동물 친구들 테마는 전용 URL로 네비게이션
    if (theme.value === 'animal-friends') {
      navigate('/ai-script/children/animal-friends');
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedTheme || !selectedScriptLength) {
      toast.error('테마와 대본 길이를 선택해주세요.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedScript('');
    setProgress(0);

    try {
      // 테마별 기본 캐릭터 설정
      const defaultCharacters = [
        { name: '주인공', gender: 'random', age: 'children', roleType: '주연', percentage: 60 },
        { name: '친구', gender: 'random', age: 'children', roleType: '조연', percentage: 40 }
      ];

      // 테마별 전용 프롬프트 생성
      const themePrompt = `🎭 어린이 연극 "${selectedTheme.label}" 테마 대본 생성

📝 기본 설정:
- 테마: ${selectedTheme.label} (${selectedTheme.genre})
- 대본 길이: ${lengths.find(l => l.value === selectedScriptLength)?.label || '중간'}
- 연령대: 5-12세 어린이 대상
- 등장인물: 주인공, 친구

🎨 테마 특성:
- ${selectedTheme.description}
- 어린이들이 이해하기 쉬운 단순하고 명확한 스토리
- 교훈적이면서도 재미있는 내용
- 참여형 연극으로 관객도 함께할 수 있는 요소 포함
- 긍정적이고 희망적인 메시지 전달`;

      setFinalPrompt(themePrompt);

      const requestData = {
        template: 'children',
        theme: selectedTheme.value,
        themePrompt: themePrompt,
        characterCount: '2',
        characters: defaultCharacters,
        genre: selectedTheme.genre,
        length: selectedScriptLength,
        age: 'children',
        gender: 'random'
      };

      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setProgress(Math.min(currentProgress, 90));
      }, 500);

      const response = await api.post('/ai-script/generate', requestData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.data && response.data.success) {
        const scriptContent = typeof response.data.script === 'object' && response.data.script !== null ? 
                             response.data.script.content : response.data.script;
        
        setGeneratedScript(scriptContent);
        setGeneratedScriptId(response.data.scriptId);
        toast.success('🎭 어린이 연극 대본이 생성되었습니다!');
        
        setTimeout(() => {
          setProgress(0);
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
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {/* 뒤로가기 버튼 */}
          {onBack && (
            <motion.button
              onClick={onBack}
              className="absolute top-8 left-8 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </motion.button>
          )}

          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            어린이 연극 테마
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            아이들과 함께할 특별한 연극 테마를 선택하세요
          </p>
        </motion.div>

        {/* 대본 생성이 완료된 경우 */}
        {generatedScript ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* 생성 완료 헤더 */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mb-4 shadow-lg"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🎭 어린이 연극 대본 생성 완료!</h2>
              <p className="text-gray-600">생성된 대본을 확인하고 연습에 활용해보세요.</p>
            </div>

            {/* 생성된 대본 표시 */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-2 sm:space-y-0">
                <h3 className="text-lg font-semibold text-gray-800">{selectedTheme?.icon} {selectedTheme?.label} 대본</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {lengths.find(l => l.value === selectedScriptLength)?.label || '중간'} 분량
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    {selectedTheme?.genre}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <ScriptRenderer script={generatedScript} />
              </div>
            </div>

            {/* 프롬프트 표시 */}
            {finalPrompt && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
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
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-80 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                    {finalPrompt}
                  </pre>
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedScript);
                  toast.success('대본이 클립보드에 복사되었습니다!');
                }}
                className="flex items-center justify-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md"
              >
                <Copy className="w-4 h-4 mr-2" />
                복사
              </button>
              <button
                onClick={() => window.location.href = '/script-vault'}
                className="flex items-center justify-center px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md"
              >
                <Archive className="w-4 h-4 mr-2" />
                대본함
              </button>
              <button
                onClick={() => toast.info('메모 기능은 개발 중입니다.')}
                className="flex items-center justify-center px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-md"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                메모
              </button>
              <button
                onClick={() => {
                  setGeneratedScript('');
                  setFinalPrompt('');
                  setError('');
                  setSelectedTheme(null);
                  setProgress(0);
                }}
                className="flex items-center justify-center px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 생성
              </button>
            </div>
          </motion.div>
        ) : (
          /* 테마 선택 및 설정 화면 */
          <div className="space-y-12">
            {/* 테마 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {childrenThemes.map((theme, index) => (
                <motion.div
                  key={theme.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleThemeClick(theme)}
                  className={`group bg-white rounded-3xl border-2 p-8 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1 ${
                    selectedTheme?.value === theme.value 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-center space-y-6">
                    <div className={`text-6xl transition-transform duration-300 ${
                      selectedTheme?.value === theme.value ? 'scale-110' : 'group-hover:scale-110'
                    }`}>
                      {theme.icon}
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className={`text-xl font-semibold transition-colors ${
                        selectedTheme?.value === theme.value 
                          ? 'text-purple-700' 
                          : 'text-gray-900 group-hover:text-purple-600'
                      }`}>
                        {theme.label}
                      </h3>
                      <p className={`text-sm leading-relaxed ${
                        selectedTheme?.value === theme.value ? 'text-purple-600' : 'text-gray-500'
                      }`}>
                        {theme.description}
                      </p>
                    </div>
                    
                    {/* 장르 태그 */}
                    <div className="pt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        selectedTheme?.value === theme.value 
                          ? 'bg-purple-200 text-purple-800' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {theme.genre}
                      </span>
                    </div>
                    
                    {/* 동물 친구들 테마 특별 표시 또는 선택 표시 */}
                    {theme.value === 'animal-friends' ? (
                      <div className="pt-4">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-medium group-hover:from-orange-600 group-hover:to-red-600 transition-all">
                          동물 선택 →
                        </div>
                      </div>
                    ) : selectedTheme?.value === theme.value ? (
                      <div className="pt-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4">
                        <div className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium group-hover:bg-purple-600 transition-colors">
                          선택하기
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 대본 설정 섹션 - 동물 친구들이 아닌 테마들만 */}
            {selectedTheme && selectedTheme.value !== 'animal-friends' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-8"
              >
                <h3 className="text-2xl font-semibold text-center text-gray-900 mb-8">대본 설정</h3>
                
                {/* 대본 길이 설정 */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">대본 길이</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {lengths.map((length) => (
                        <button
                          key={length.value}
                          onClick={() => setSelectedScriptLength(length.value)}
                          className={`p-4 border-2 rounded-xl transition-all text-center ${
                            selectedScriptLength === length.value
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-300 text-gray-700'
                          }`}
                        >
                          <div className="text-2xl mb-2">{length.icon}</div>
                          <h5 className="font-semibold mb-1">{length.label}</h5>
                          <p className="text-sm">{length.time}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 생성 진행률 표시 */}
                  {isGenerating && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-purple-600 font-medium">대본을 생성하고 있습니다...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-center text-sm text-gray-600">
                        {progress < 30 && '테마 분석 중...'}
                        {progress >= 30 && progress < 60 && '캐릭터 설정 중...'}
                        {progress >= 60 && progress < 90 && '스토리 구성 중...'}
                        {progress >= 90 && '대본 완성 중...'}
                      </div>
                    </div>
                  )}

                  {/* 에러 메시지 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center text-red-700">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  {/* 생성 버튼 */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleGenerateScript}
                      disabled={!selectedTheme || isGenerating}
                      className="flex items-center px-8 py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5 mr-2" />
                          대본 생성하기
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm max-w-3xl mx-auto">
            각 테마는 어린이의 발달 단계와 흥미를 고려하여 특별히 설계되었습니다. 
            선택한 테마에 따라 맞춤형 캐릭터와 스토리가 제공됩니다.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default ChildrenThemeSelection;