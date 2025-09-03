import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, RotateCcw, Wand2, RefreshCw, Copy, Save, Archive, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Dropdown from '../../components/common/Dropdown';
import ScriptRenderer from '../../components/common/ScriptRenderer';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AnimalSelection = ({
  availableAnimals,
  selectedAnimals,
  selectedScriptLength,
  lengths,
  onAnimalToggle,
  onAnimalPercentageChange,
  onAnimalRoleChange,
  onScriptLengthChange,
  onBack,
  isLengthDropdownOpen,
  setIsLengthDropdownOpen,
  usageData = {},
  selectedTheme
}) => {
  const { addSavedScript, user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');
  const totalPercentage = selectedAnimals.reduce((sum, animal) => sum + animal.percentage, 0);
  const isValid = selectedAnimals.length > 0 && totalPercentage === 100;

  // 비율 자동 균등 분배
  const handleAutoDistribute = () => {
    if (selectedAnimals.length === 0) return;
    
    const equalPercentage = Math.floor(100 / selectedAnimals.length);
    const remainder = 100 % selectedAnimals.length;
    
    selectedAnimals.forEach((animal, index) => {
      const percentage = index < remainder ? equalPercentage + 1 : equalPercentage;
      onAnimalPercentageChange(animal.value, percentage);
    });
  };

  // 테마별 전용 프롬프트 생성
  const getThemePrompt = (theme, animals, scriptLength) => {
    const animalList = animals.map(a => `${a.name}(${a.label})`).join(', ');
    const animalDetails = animals.map(a => 
      `- ${a.name}(${a.label}): ${a.personality}, ${a.voiceStyle}, 역할: ${a.roleType}, 대사분량: ${a.percentage}%`
    ).join('\n');
    
    return `🎭 어린이 연극 "${theme?.label}" 테마 대본 생성

📝 기본 설정:
- 등장 동물: ${animalList}
- 대본 길이: ${lengths.find(l => l.value === scriptLength)?.label || '중간'}
- 연령대: 5-12세 어린이 대상

🐾 동물 캐릭터 상세 정보:
${animalDetails}

🎨 테마별 특성:
- 따뜻하고 우호적인 동물 공동체
- 서로 도우며 문제를 해결하는 협력적 스토리
- 각 동물의 특성을 살린 개성 있는 대화
- 자연 속에서의 평화로운 일상
- 교훈: 다름을 인정하고 서로 도우며 살아가는 지혜`;
  };

  // 대본 생성 핸들러
  const handleGenerateScript = async () => {
    if (selectedAnimals.length === 0) {
      toast.error('최소 1개의 동물을 선택해주세요.');
      return;
    }
    
    if (totalPercentage !== 100) {
      toast.error('대사 분량 합계가 100%가 되어야 합니다.');
      return;
    }

    if (!selectedScriptLength) {
      toast.error('대본 길이를 선택해주세요.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedScript('');
    setProgress(0);

    try {
      // 테마별 전용 프롬프트 생성
      const themePrompt = getThemePrompt(
        selectedTheme, 
        selectedAnimals, 
        selectedScriptLength
      );

      setFinalPrompt(themePrompt);

      const requestData = {
        template: 'children',
        theme: selectedTheme?.value || 'animal-friends',
        themePrompt: themePrompt,
        characterCount: selectedAnimals.length.toString(),
        characters: selectedAnimals.map((animal, index) => ({
          name: animal.name,
          gender: 'random',
          age: 'children',
          roleType: animal.roleType || (index === 0 ? '주연' : '조연'),
          percentage: animal.percentage,
          relationshipWith: index > 0 ? selectedAnimals[0].name : '',
          relationshipType: index > 0 ? '친구' : '',
          animalType: animal.value,
          personality: animal.personality,
          voiceStyle: animal.voiceStyle
        })),
        genre: selectedTheme?.genre || '동물 친구들',
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

  // 대본이 생성된 경우 결과 화면 렌더링
  if (generatedScript) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-7xl mx-auto">
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-8"
            >
              <div className="text-center mb-8">
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

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-800">{selectedTheme?.icon} {selectedTheme?.label} 대본</h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                    {selectedAnimals.map((animal, index) => (
                      <span key={index} className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                        {animal.icon} {animal.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start sm:items-center text-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다 (최소 5자 이상)</span>
                  </div>
                </div>
                
                <div className="script-content cursor-text select-text">
                  <ScriptRenderer script={generatedScript} />
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
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
                  onClick={() => window.location.href = '/script-vault'}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">대본함</span>
                  <span className="sm:hidden">함</span>
                </button>
                <button
                  onClick={() => toast.info('메모 기능은 개발 중입니다.')}
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
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  다시 생성
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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
            동물 친구들 선택
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            연극에 등장할 동물 친구들을 선택하고 역할을 정해주세요
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* 동물 선택 영역 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                동물 캐릭터 선택
              </h2>
              
              {/* 동물 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableAnimals.map((animal) => {
                  const isSelected = selectedAnimals.some(a => a.value === animal.value);
                  return (
                    <motion.div
                      key={animal.value}
                      onClick={() => onAnimalToggle(animal)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-3xl">{animal.icon}</div>
                        <div className="font-medium text-sm text-gray-900">
                          {animal.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {animal.personality}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* 선택된 동물들 설정 */}
            {selectedAnimals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    선택된 동물들 ({selectedAnimals.length}마리)
                  </h3>
                  <button
                    onClick={handleAutoDistribute}
                    className="flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    균등 분배
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedAnimals.map((animal, index) => (
                    <div key={animal.value} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{animal.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {animal.label} ({animal.name})
                            </div>
                            <div className="text-xs text-gray-500">
                              {animal.personality} • {animal.voiceStyle}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* 역할 선택 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            역할
                          </label>
                          <select
                            value={animal.roleType || '조연'}
                            onChange={(e) => onAnimalRoleChange(animal.value, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="주연">주연</option>
                            <option value="조연">조연</option>
                            <option value="단역">단역</option>
                          </select>
                        </div>

                        {/* 대사 분량 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            대사 분량 (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={animal.percentage || 0}
                            onChange={(e) => onAnimalPercentageChange(animal.value, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 분량 합계 표시 */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">총 대사 분량:</span>
                    <span className={`font-semibold ${
                      totalPercentage === 100 ? 'text-green-600' : 
                      totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  {totalPercentage !== 100 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {totalPercentage > 100 ? 
                        `${totalPercentage - 100}% 초과됨` : 
                        `${100 - totalPercentage}% 부족함`
                      }
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 설정 및 생성 영역 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                대본 설정
              </h3>

              {/* 대본 길이 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대본 길이
                </label>
                <Dropdown
                  options={lengths.filter(l => l.available).map(l => `${l.label} (${l.time})`)}
                  value={selectedScriptLength ? `${lengths.find(l => l.value === selectedScriptLength)?.label} (${lengths.find(l => l.value === selectedScriptLength)?.time})` : ''}
                  onChange={(value) => {
                    const length = lengths.find(l => `${l.label} (${l.time})` === value);
                    onScriptLengthChange(length?.value || '');
                  }}
                  placeholder="길이를 선택하세요"
                  isOpen={isLengthDropdownOpen}
                  setIsOpen={setIsLengthDropdownOpen}
                />
              </div>

              {/* 선택 요약 */}
              {selectedAnimals.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">선택 요약</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>등장 동물: {selectedAnimals.length}마리</div>
                    <div>주연: {selectedAnimals.filter(a => a.roleType === '주연').length}마리</div>
                    <div>조연: {selectedAnimals.filter(a => (a.roleType || '조연') === '조연').length}마리</div>
                    {selectedScriptLength && (
                      <div>
                        길이: {lengths.find(l => l.value === selectedScriptLength)?.label}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 생성 진행률 표시 */}
              {isGenerating && (
                <div className="mb-6 space-y-4">
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
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center text-red-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* 대본 생성 버튼 */}
              <button
                onClick={handleGenerateScript}
                disabled={!isValid || !selectedScriptLength || isGenerating}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  isValid && selectedScriptLength && !isGenerating
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin inline" />
                    생성 중...
                  </>
                ) : !selectedAnimals.length ? 
                  '동물을 선택해주세요' 
                  : totalPercentage !== 100 ? 
                    '대사 분량을 100%로 맞춰주세요'
                    : !selectedScriptLength ?
                      '대본 길이를 선택해주세요'
                      : (
                        <>
                          <Wand2 className="w-5 h-5 mr-2 inline" />
                          대본 생성하기
                        </>
                      )
                }
              </button>

              {selectedAnimals.length > 0 && totalPercentage !== 100 && (
                <div className="mt-3 text-xs text-gray-500 text-center">
                  '균등 분배' 버튼을 사용하면 자동으로 100%가 됩니다
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimalSelection;