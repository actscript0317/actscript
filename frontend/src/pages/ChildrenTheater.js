import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, 
  Copy, 
  RefreshCw,
  ArrowRight,
  Check,
  Archive,
  Edit3,
  ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChildrenTheater = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 원래 AIScript.js와 동일한 상태 관리
  const [usageData, setUsageData] = useState({
    used: 0,
    limit: 10,
    isPremium: true,
    isActive: true,
    canGenerate: true,
    planType: 'test',
    nextResetDate: null,
    daysUntilReset: 0
  });

  const [formData, setFormData] = useState({
    template: 'children',
    characterCount: '1',
    genre: '',
    length: '',
    gender: 'random',
    age: 'children',
    characters: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  
  // 어린이 연극 전용 상태
  const [selectedChildrenTheme, setSelectedChildrenTheme] = useState(null);
  const [showChildrenThemeSelection, setShowChildrenThemeSelection] = useState(true);
  const [showAnimalSelection, setShowAnimalSelection] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');

  // 리라이팅 관련 상태
  const [selectedText, setSelectedText] = useState('');
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  
  // 메모 관련 상태
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [scriptMemo, setScriptMemo] = useState('');

  // 원래 AIScript.js의 데이터들을 그대로 복사
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

  const availableAnimals = [
    { value: 'rabbit', label: '토끼', icon: '🐰', personality: '활발하고 친근한', voiceStyle: '밝고 경쾌한', roleType: '주연' },
    { value: 'bear', label: '곰', icon: '🐻', personality: '온화하고 든든한', voiceStyle: '따뜻하고 안정감 있는', roleType: '조연' },
    { value: 'fox', label: '여우', icon: '🦊', personality: '영리하고 재치있는', voiceStyle: '똑똑하고 재빠른', roleType: '조연' },
    { value: 'cat', label: '고양이', icon: '🐱', personality: '우아하고 독립적인', voiceStyle: '부드럽고 우아한', roleType: '조연' },
    { value: 'dog', label: '강아지', icon: '🐶', personality: '충실하고 활기찬', voiceStyle: '밝고 열정적인', roleType: '조연' },
    { value: 'pig', label: '돼지', icon: '🐷', personality: '순수하고 정직한', voiceStyle: '순진하고 솔직한', roleType: '조연' }
  ];

  const lengths = [
    { value: 'short', label: '짧은 대본 (1-3분)' },
    { value: 'medium', label: '중간 길이 (3-5분)' },
    { value: 'long', label: '긴 대본 (5-10분)' }
  ];

  // 원래 AIScript.js의 함수들을 그대로 복사
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

  // 테마 프롬프트 생성 함수 (원래 AIScript.js에서 복사)
  const getThemePrompt = (themeValue, animals, length) => {
    const basePrompt = `당신은 한국의 어린이 연극 대본을 전문적으로 쓰는 작가입니다.`;
    
    if (themeValue === 'animal-friends') {
      return `${basePrompt}

다음 동물 캐릭터들이 등장하는 교육적이고 재미있는 어린이 연극 대본을 작성해주세요:
${animals.map(animal => `- ${animal.label} (${animal.personality}, ${animal.voiceStyle} 목소리)`).join('\n')}

대본 길이: ${length}
연령대: 5~12세 어린이
교육적 메시지: 동물들의 우정과 협력을 통한 성장 이야기

출력 형식을 반드시 다음과 같이 해주세요:

===제목===
[동물 친구들의 모험 등 매력적인 제목]

===상황 설명===
[어떤 상황에서 어떤 이야기가 펼쳐지는지 3-4줄로 설명]

===등장인물===
${animals.map(animal => `${animal.label}: ${animal.personality}, ${animal.voiceStyle} 목소리`).join('\n')}

===대본===
[각 동물 캐릭터의 성격을 잘 살린 자연스러운 대화]
[어린이가 이해하기 쉽고 교육적인 내용]
[폭력적이거나 무서운 내용 금지]`;
    }
    
    return basePrompt;
  };

  // 동물 선택/해제 처리 (원래 AIScript.js에서 복사)
  const handleAnimalToggle = (animal) => {
    setSelectedAnimals(prev => {
      const exists = prev.find(a => a.value === animal.value);
      if (exists) {
        return prev.filter(a => a.value !== animal.value);
      } else if (prev.length < 6) {
        return [...prev, { 
          ...animal, 
          percentage: prev.length === 0 ? 40 : Math.floor(60 / (prev.length + 1))
        }];
      }
      return prev;
    });
  };

  // 어린이 연극 대본 생성 (원래 AIScript.js에서 복사)
  const generateChildrenScript = async () => {
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
      const animalCharacters = selectedAnimals.map((animal, index) => ({
        name: animal.name || animal.label,
        species: animal.label,
        gender: 'random',
        age: 'children',
        roleType: animal.roleType || (index === 0 ? '주연' : '조연'),
        percentage: animal.percentage,
        relationshipWith: index > 0 ? selectedAnimals[0].name : '',
        relationshipType: index > 0 ? '친구' : '',
        animalType: animal.value,
        personality: animal.personality,
        voiceStyle: animal.voiceStyle
      }));

      const themePrompt = getThemePrompt(
        selectedChildrenTheme.value, 
        selectedAnimals, 
        lengths.find(l => l.value === selectedScriptLength)?.label || '중간'
      );

      setFinalPrompt(themePrompt);

      const requestData = {
        template: 'children',
        theme: selectedChildrenTheme.value,
        themePrompt: themePrompt,
        characterCount: selectedAnimals.length.toString(),
        characters: animalCharacters,
        genre: selectedChildrenTheme.genre,
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

      const response = await api.post('/children-theater/generate', requestData);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (response.data && response.data.script) {
        const scriptContent = response.data.script.content || response.data.script;
        setGeneratedScript(scriptContent);
        setGeneratedScriptId(response.data.script.id);
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

  // 텍스트 선택 핸들러
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length >= 5 && selectedText.length <= 500) {
      setSelectedText(selectedText);
    }
  };

  // 스크립트 파싱 (원래 AIScript.js에서 복사)
  const parseAndRenderScript = (script) => {
    if (!script) return null;
    
    const lines = script.split('\n');
    const elements = [];
    let currentSection = '';
    
    lines.forEach((line, index) => {
      if (line.startsWith('===') && line.endsWith('===')) {
        currentSection = line.replace(/===/g, '').trim();
        elements.push(
          <div key={index} className="font-bold text-lg text-purple-700 mt-4 mb-2 border-b border-purple-200 pb-1">
            {currentSection}
          </div>
        );
      } else if (line.trim()) {
        if (currentSection === '대본' && (line.includes(':') || line.includes('：'))) {
          const [speaker, ...dialogueParts] = line.split(/[:：]/);
          const dialogue = dialogueParts.join(':').trim();
          
          if (speaker && dialogue) {
            elements.push(
              <div key={index} className="mb-2 pl-2">
                <span className="font-semibold text-blue-600">{speaker.trim()}:</span>
                <span className="ml-2 text-gray-800">{dialogue}</span>
              </div>
            );
          } else {
            elements.push(
              <div key={index} className="mb-1 text-gray-700">
                {line}
              </div>
            );
          }
        } else {
          elements.push(
            <div key={index} className="mb-1 text-gray-700 leading-relaxed">
              {line}
            </div>
          );
        }
      } else if (line === '') {
        elements.push(<div key={index} className="mb-2"></div>);
      }
    });
    
    return elements;
  };

  // 메모 모달 관련 함수들
  const openMemoModal = () => {
    setShowMemoModal(true);
  };

  const closeMemoModal = () => {
    setShowMemoModal(false);
  };

  // 테마 선택 렌더링 (원래 AIScript.js에서 복사)
  const renderChildrenThemeSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 뒤로가기 버튼 */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => navigate('/ai-script')}
              className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>템플릿 선택으로 돌아가기</span>
            </button>
          </div>

          {/* 헤더 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl mb-6 shadow-lg">
              <span className="text-4xl">🎭</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              어린이 연극 테마 선택
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              어떤 테마의 어린이 연극 대본을 만들까요?
            </p>
          </motion.div>

          {/* 테마 선택 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {childrenThemes.map((theme, index) => (
              <motion.div
                key={theme.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  setSelectedChildrenTheme(theme);
                  if (theme.value === 'animal-friends') {
                    setShowChildrenThemeSelection(false);
                    setShowAnimalSelection(true);
                  }
                }}
                className={`bg-gradient-to-r ${theme.color} rounded-xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{theme.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{theme.label}</h3>
                  <p className="text-sm opacity-90">{theme.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 동물 선택 렌더링 (원래 AIScript.js에서 복사 - 간소화)
  const renderAnimalSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* 헤더 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {/* 뒤로가기 버튼 */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => {
                  setShowAnimalSelection(false);
                  setShowChildrenThemeSelection(true);
                  setSelectedAnimals([]);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>테마 다시 선택</span>
              </button>
            </div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl mb-6 shadow-lg">
              <span className="text-3xl">🐰</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              🎭 동물 친구들 선택
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              연극에 등장할 동물 캐릭터들을 선택하고 역할을 정해주세요
            </p>
          </motion.div>

          {/* 동물 선택 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {availableAnimals.map((animal, index) => {
              const isSelected = selectedAnimals.some(a => a.value === animal.value);
              return (
                <motion.div
                  key={animal.value}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAnimalToggle(animal)}
                  className={`bg-white rounded-xl shadow-md border-2 p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${
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

          {/* 길이 선택 및 생성 버튼 */}
          {selectedAnimals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                선택된 동물들 ({selectedAnimals.length}마리)
              </h3>
              
              {/* 길이 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">대본 길이</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {lengths.map((length) => (
                    <button
                      key={length.value}
                      onClick={() => setSelectedScriptLength(length.value)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedScriptLength === length.value
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
                  onClick={generateChildrenScript}
                  disabled={isGenerating}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isGenerating ? '대본 생성 중...' : '🎭 대본 생성하기'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
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

      {/* 진행바 */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 mb-8"
          >
            <div className="text-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900">🎭 어린이 연극 대본 생성 중...</h3>
              <p className="text-gray-600 mt-2">AI가 창의적인 대본을 작성하고 있어요</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
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
      </AnimatePresence>

      {/* 에러 메시지 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 화면 렌더링 */}
      {showChildrenThemeSelection ? renderChildrenThemeSelection() :
       showAnimalSelection ? (
         <div>
           {renderAnimalSelection()}
           
           {/* 생성된 대본 결과 - 동물 선택 화면에서 표시 */}
           {generatedScript && (
             <div className="container mx-auto px-2 sm:px-4 mt-8">
               <div className="max-w-7xl mx-auto">
                 <motion.div
                   id="result"
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
                     <p className="text-gray-600">생성된 동물 친구들 대본을 확인하고 연습에 활용해보세요.</p>
                   </div>

                   <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                       <h3 className="text-lg font-semibold text-gray-800">🐰 동물 친구들 연극 대본</h3>
                       <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                         <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                           {selectedAnimals.length}마리
                         </span>
                         <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                           어린이 연극
                         </span>
                         <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-700 rounded-full">
                           {selectedChildrenTheme?.label || '동물 친구들'}
                         </span>
                         <span className="px-2 py-1 sm:px-3 bg-orange-100 text-orange-700 rounded-full">
                           {lengths.find(l => l.value === selectedScriptLength)?.label}
                         </span>
                       </div>
                     </div>
                     
                     <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                       <div className="flex items-start sm:items-center text-blue-700">
                         <RefreshCw className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                         <span className="text-xs sm:text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다 (최소 5자 이상)</span>
                       </div>
                     </div>
                     
                     <div 
                       className="bg-white rounded-lg p-3 sm:p-4 md:p-6 border border-gray-200 max-h-[60vh] sm:max-h-96 overflow-y-auto cursor-text select-text text-sm sm:text-base leading-relaxed"
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
               </div>
             </div>
           )}
         </div>
       ) : null}
    </div>
  );
};

export default ChildrenTheater;