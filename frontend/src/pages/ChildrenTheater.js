import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, 
  Users, 
  Clock, 
  Wand2, 
  Copy, 
  Save,
  RefreshCw,
  ChevronDown,
  X,
  Film,
  ArrowRight,
  Check,
  Archive,
  RotateCcw,
  AlertCircle,
  Edit3,
  FileText,
  ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ChildrenThemeSelection from './ai-script/ChildrenThemeSelection';
import AnimalSelection from './ai-script/AnimalSelection';
import ScriptRenderer from '../components/common/ScriptRenderer';

const ChildrenTheater = () => {
  const { addSavedScript, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 사용량 관리 상태 (테스트 플랜: 월 10회 제한, 모든 기능 이용 가능)
  const [usageData, setUsageData] = useState({
    used: 0,
    limit: 10,
    isPremium: true, // 모든 사용자에게 프리미엄 기능 제공
    isActive: true,
    canGenerate: true,
    planType: 'test',
    nextResetDate: null,
    daysUntilReset: 0
  });
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    template: 'children', // 어린이 템플릿으로 고정
    characterCount: '1',
    genre: '',
    length: '',
    gender: '',
    age: 'children', // 어린이 연령으로 고정
    characters: [],
    // 새로운 옵션들
    characterRelationships: '', // 인물 간 이해관계
    customPrompt: '' // 프롬프트 작성란
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null); // MongoDB에 저장된 스크립트 ID
  const [finalPrompt, setFinalPrompt] = useState(''); // AI에게 전송된 최종 프롬프트
  const [error, setError] = useState('');
  
  // 리라이팅 관련 상태
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextStart, setSelectedTextStart] = useState(0);
  const [selectedTextEnd, setSelectedTextEnd] = useState(0);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteIntensity, setRewriteIntensity] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState(null);
  
  // 메모 관련 상태
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [scriptMemo, setScriptMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  
  // 사용량 정보 로딩 상태
  const [loadingUsage, setLoadingUsage] = useState(true);
  
  // 커스텀 프롬프트 태그 관련 상태
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [textareaRef, setTextareaRef] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // 어린이 연극 전용 상태 관리
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showChildrenThemeSelection, setShowChildrenThemeSelection] = useState(true);
  const [selectedChildrenTheme, setSelectedChildrenTheme] = useState(null);
  const [showAnimalSelection, setShowAnimalSelection] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');
  const [progress, setProgress] = useState(0);

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      setLoadingUsage(true);
      const response = await api.get('/ai-script/usage');
      const { usage } = response.data;
      
      setUsageData({
        used: usage.currentMonth,
        limit: usage.limit,
        isPremium: true, // 모든 사용자에게 프리미엄 기능 제공
        isActive: true,
        canGenerate: usage.canGenerate,
        planType: 'test',
        nextResetDate: usage.nextResetDate,
        daysUntilReset: usage.daysUntilReset
      });
    } catch (error) {
      console.error('사용량 정보 로딩 실패:', error);
      // 기본값으로 설정 (테스트 플랜)
      setUsageData(prev => ({
        ...prev,
        used: user?.usage?.currentMonth || 0,
        limit: user?.usage?.monthly_limit || 10,
        isPremium: true, // 모든 사용자에게 프리미엄 기능 제공
        planType: 'test'
      }));
    } finally {
      setLoadingUsage(false);
    }
  };

  // 컴포넌트 마운트 시 사용량 정보 로딩
  useEffect(() => {
    if (user) {
      fetchUsageInfo();
    }
  }, [user]);

  // 어린이 연극 테마들
  const childrenThemes = [
    {
      value: 'animal-friends',
      label: '동물 친구들',
      description: '토끼, 고양이, 강아지 등 귀여운 동물들이 등장하는 따뜻한 이야기',
      icon: '🐰',
      genre: '동물 친구들'
    },
    {
      value: 'magic-adventure',
      label: '마법의 모험',
      description: '마법사와 요정들이 등장하는 환상적인 모험 이야기',
      icon: '🪄',
      genre: '마법의 세계'
    },
    {
      value: 'friendship',
      label: '우정 이야기',
      description: '친구들과 함께 문제를 해결하고 도우며 성장하는 이야기',
      icon: '👫',
      genre: '우정과 모험'
    },
    {
      value: 'school-life',
      label: '학교 생활',
      description: '학교에서 일어나는 재미있고 교훈적인 일상 이야기',
      icon: '🎒',
      genre: '학교 생활'
    },
    {
      value: 'dreams-imagination',
      label: '꿈과 상상',
      description: '아이들의 무한한 상상력과 꿈을 키워주는 창의적인 이야기',
      icon: '🌟',
      genre: '꿈과 상상'
    }
  ];

  // 어린이 연극용 동물 캐릭터들
  const availableAnimals = [
    { value: 'rabbit', label: '토끼', icon: '🐰', personality: '활발하고 호기심 많은', voiceStyle: '밝고 경쾌한' },
    { value: 'cat', label: '고양이', icon: '🐱', personality: '영리하고 독립적인', voiceStyle: '우아하고 자신감 있는' },
    { value: 'dog', label: '강아지', icon: '🐶', personality: '충실하고 친근한', voiceStyle: '따뜻하고 다정한' },
    { value: 'bear', label: '곰', icon: '🐻', personality: '다정하고 든든한', voiceStyle: '깊고 안정감 있는' },
    { value: 'fox', label: '여우', icon: '🦊', personality: '영리하고 재치있는', voiceStyle: '똑똑하고 재빠른' },
    { value: 'lion', label: '사자', icon: '🦁', personality: '용감하고 당당한', voiceStyle: '웅장하고 카리스마 있는' },
    { value: 'elephant', label: '코끼리', icon: '🐘', personality: '지혜롭고 온화한', voiceStyle: '느리고 심사숙고하는' },
    { value: 'monkey', label: '원숭이', icon: '🐵', personality: '장난기 많고 활동적인', voiceStyle: '빠르고 장난스러운' },
    { value: 'panda', label: '판다', icon: '🐼', personality: '평화롭고 느긋한', voiceStyle: '차분하고 온순한' },
    { value: 'pig', label: '돼지', icon: '🐷', personality: '순수하고 정직한', voiceStyle: '단순하고 진실한' },
    { value: 'chicken', label: '닭', icon: '🐔', personality: '부지런하고 꼼꼼한', voiceStyle: '정확하고 분명한' },
    { value: 'duck', label: '오리', icon: '🦆', personality: '쾌활하고 사교적인', voiceStyle: '명랑하고 수다스러운' },
    { value: 'sheep', label: '양', icon: '🐑', personality: '온순하고 따뜻한', voiceStyle: '부드럽고 다정한' },
    { value: 'horse', label: '말', icon: '🐴', personality: '자유롭고 역동적인', voiceStyle: '힘차고 활기찬' },
    { value: 'turtle', label: '거북이', icon: '🐢', personality: '신중하고 끈기있는', voiceStyle: '느리고 차분한' },
    { value: 'penguin', label: '펭귄', icon: '🐧', personality: '사교적이고 협동적인', voiceStyle: '재미있고 친근한' }
  ];

  // 대본 길이 옵션
  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분 (약 12~16줄)', icon: '⚡', available: true },
    { value: 'medium', label: '중간', time: '3~5분 (약 25~35줄)', icon: '⏱️', available: true },
    { value: 'long', label: '길게', time: '5~10분 (약 50~70줄)', icon: '📝', available: true }
  ];

  // 테마 선택 핸들러
  const handleChildrenThemeSelect = (themeValue) => {
    const theme = childrenThemes.find(t => t.value === themeValue);
    if (theme) {
      setSelectedChildrenTheme(theme);
      setFormData(prev => ({
        ...prev,
        genre: theme.genre,
        characterCount: '2'
      }));
      setShowChildrenThemeSelection(false);
      
      // 동물 친구들 테마는 동물 선택으로, 다른 테마는 일반 대본 생성으로
      if (theme.value === 'animal-friends') {
        setShowAnimalSelection(true);
      }
    }
  };

  // 동물 선택 핸들러
  const handleAnimalToggle = (animal) => {
    setSelectedAnimals(prev => {
      const isSelected = prev.some(a => a.value === animal.value);
      if (isSelected) {
        return prev.filter(a => a.value !== animal.value);
      } else {
        const newAnimal = {
          ...animal,
          name: animal.label,
          percentage: Math.floor(100 / (prev.length + 1)), // 균등 분배
          roleType: prev.length === 0 ? '주연' : '조연' // 첫 번째는 주연, 나머지는 조연
        };
        // 기존 동물들 비율 재계산
        const updatedAnimals = prev.map(a => ({
          ...a,
          percentage: Math.floor(100 / (prev.length + 1))
        }));
        return [...updatedAnimals, newAnimal];
      }
    });
  };

  // 동물 대사 비율 조정 핸들러
  const handleAnimalPercentageChange = (animalValue, percentage) => {
    setSelectedAnimals(prev => 
      prev.map(animal => 
        animal.value === animalValue 
          ? { ...animal, percentage: parseInt(percentage) }
          : animal
      )
    );
  };

  // 동물 역할 변경 핸들러
  const handleAnimalRoleChange = (animalValue, roleType) => {
    setSelectedAnimals(prev => 
      prev.map(animal => 
        animal.value === animalValue 
          ? { ...animal, roleType }
          : animal
      )
    );
  };

  // 테마별 전용 프롬프트
  const getThemePrompt = (theme, animals, scriptLength) => {
    const animalList = animals.map(a => `${a.name}(${a.label})`).join(', ');
    const animalDetails = animals.map(a => 
      `- ${a.name}(${a.label}): ${a.personality}, ${a.voiceStyle}, 역할: ${a.roleType}, 대사분량: ${a.percentage}%`
    ).join('\n');
    
    return `🎭 어린이 연극 "${selectedChildrenTheme?.label}" 테마 대본 생성

📝 기본 설정:
- 등장 동물: ${animalList}
- 대본 길이: ${scriptLength}
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

  // 동물 선택 완료 및 대본 생성 핸들러
  const handleAnimalSelectionComplete = async () => {
    if (selectedAnimals.length === 0) {
      toast.error('최소 1개의 동물을 선택해주세요.');
      return;
    }
    
    const totalPercentage = selectedAnimals.reduce((sum, animal) => sum + animal.percentage, 0);
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
        selectedChildrenTheme, 
        selectedAnimals, 
        lengths.find(l => l.value === selectedScriptLength)?.label || '중간'
      );

      setFinalPrompt(themePrompt);

      const requestData = {
        template: 'children',
        theme: selectedChildrenTheme.value,
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

  // 네비게이션 핸들러들
  const handleBackToThemeFromAnimals = () => {
    setShowAnimalSelection(false);
    setShowChildrenThemeSelection(true);
    setSelectedAnimals([]);
  };

  const handleBackToTemplatesFromTheme = () => {
    navigate('/ai-script');
  };

  // 텍스트 선택 처리
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection.toString().trim();
    
    if (selected && selected.length >= 5) {
      const scriptElement = document.querySelector('.script-content');
      if (scriptElement) {
        const scriptText = scriptElement.innerText || scriptElement.textContent;
        
        // 정규화된 텍스트로 위치 찾기
        const normalizedSelected = selected.replace(/\s+/g, ' ').trim();
        const normalizedScript = scriptText.replace(/\s+/g, ' ');
        const normalizedIndex = normalizedScript.indexOf(normalizedSelected);
        
        if (normalizedIndex !== -1) {
          // 원본 텍스트에서 실제 시작/끝 위치 계산
          let actualStart = 0;
          let actualEnd = 0;
          let normalizedPos = 0;
          
          for (let i = 0; i < scriptText.length; i++) {
            if (normalizedPos === normalizedIndex) {
              actualStart = i;
            }
            if (normalizedPos === normalizedIndex + normalizedSelected.length) {
              actualEnd = i;
              break;
            }
            if (scriptText[i].match(/\S/)) {
              normalizedPos++;
            }
          }
          
          if (actualEnd === 0) actualEnd = scriptText.length;
          
          setSelectedText(selected);
          setSelectedTextStart(actualStart);
          setSelectedTextEnd(actualEnd);
          setShowRewriteModal(true);
        }
      }
    }
  };

  // 리라이팅 처리
  const handleRewrite = async () => {
    if (!selectedText || !rewriteIntensity) return;
    
    setIsRewriting(true);
    setError('');
    
    try {
      const contextBefore = generatedScript.substring(Math.max(0, selectedTextStart - 200), selectedTextStart);
      const contextAfter = generatedScript.substring(selectedTextEnd, Math.min(generatedScript.length, selectedTextEnd + 200));
      
      const response = await api.post('/ai-script/rewrite', {
        originalText: selectedText,
        intensity: rewriteIntensity,
        contextBefore,
        contextAfter,
        scriptType: 'children'
      });
      
      if (response.data.success) {
        setRewriteResult({
          original: selectedText,
          rewritten: response.data.rewrittenText
        });
      } else {
        throw new Error(response.data.error || '리라이팅에 실패했습니다.');
      }
    } catch (error) {
      console.error('리라이팅 오류:', error);
      setError(error.response?.data?.error || error.message || '리라이팅 중 오류가 발생했습니다.');
    } finally {
      setIsRewriting(false);
    }
  };

  // 리라이팅 적용
  const applyRewrite = () => {
    if (!rewriteResult) return;
    
    const beforeText = generatedScript.substring(0, selectedTextStart);
    const afterText = generatedScript.substring(selectedTextEnd);
    const newScript = beforeText + rewriteResult.rewritten + afterText;
    
    setGeneratedScript(newScript);
    setRewriteResult(null);
    setShowRewriteModal(false);
    setSelectedText('');
    
    toast.success('리라이팅이 적용되었습니다!');
  };

  // 리라이팅 모달 닫기
  const closeRewriteModal = () => {
    setShowRewriteModal(false);
    setSelectedText('');
    setRewriteIntensity('');
    setRewriteResult(null);
  };

  // 메모 관련 함수들
  const loadMemo = async () => {
    if (generatedScriptId) {
      try {
        const response = await api.get(`/ai-script/scripts/${generatedScriptId}/memo`);
        if (response.data.success) {
          setScriptMemo(response.data.memo || '');
        }
      } catch (error) {
        console.error('메모 로딩 실패:', error);
      }
    }
  };

  const saveMemo = async () => {
    if (!generatedScriptId) return;
    
    setIsSavingMemo(true);
    try {
      const response = await api.put(`/ai-script/scripts/${generatedScriptId}/memo`, {
        memo: scriptMemo
      });
      
      if (response.data.success) {
        toast.success('메모가 저장되었습니다!');
        setShowMemoModal(false);
      }
    } catch (error) {
      console.error('메모 저장 실패:', error);
      toast.error('메모 저장에 실패했습니다.');
    } finally {
      setIsSavingMemo(false);
    }
  };

  const openMemoModal = () => {
    loadMemo();
    setShowMemoModal(true);
  };

  const closeMemoModal = () => {
    setShowMemoModal(false);
    setScriptMemo('');
  };

  // 동물 선택 화면이고 대본이 생성된 경우 렌더링
  if (showAnimalSelection && generatedScript) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-2 sm:px-4">
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
                <p className="text-gray-600">생성된 대본을 확인하고 연습에 활용해보세요.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-800">🐰 {selectedChildrenTheme?.label} 대본</h3>
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
                
                <div className="script-content cursor-text select-text" onMouseUp={handleTextSelection}>
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
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  다시 생성
                </button>
              </div>
            </motion.div>

            {/* 리라이팅 모달 */}
            <AnimatePresence>
              {showRewriteModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                  onClick={closeRewriteModal}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                            <RefreshCw className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">대본 리라이팅</h2>
                            <p className="text-gray-600">선택된 텍스트를 더 나은 표현으로 바꿔보세요</p>
                          </div>
                        </div>
                        <button
                          onClick={closeRewriteModal}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* 선택된 텍스트 표시 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-lg font-semibold text-gray-800">선택된 텍스트</label>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {selectedText.length}자
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border-2 border-blue-200">
                          <p className="text-gray-800 font-medium text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                            "{selectedText}"
                          </p>
                        </div>
                      </div>

                      {/* 리라이팅 강도 선택 */}
                      <div className="space-y-3">
                        <label className="text-lg font-semibold text-gray-800">리라이팅 강도</label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { value: 'light', label: '가볍게', desc: '문체와 단어를 조금만 수정', color: 'green' },
                            { value: 'medium', label: '적당히', desc: '자연스럽게 다시 표현', color: 'blue' },
                            { value: 'heavy', label: '강하게', desc: '완전히 새로운 표현으로 변경', color: 'purple' }
                          ].map((intensity) => (
                            <button
                              key={intensity.value}
                              type="button"
                              onClick={() => setRewriteIntensity(intensity.value)}
                              className={`p-4 border-2 rounded-xl transition-all text-left ${
                                rewriteIntensity === intensity.value
                                  ? `border-${intensity.color}-500 bg-${intensity.color}-50`
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className={`font-semibold ${
                                    rewriteIntensity === intensity.value ? `text-${intensity.color}-700` : 'text-gray-900'
                                  }`}>
                                    {intensity.label}
                                  </h4>
                                  <p className={`text-sm ${
                                    rewriteIntensity === intensity.value ? `text-${intensity.color}-600` : 'text-gray-600'
                                  }`}>
                                    {intensity.desc}
                                  </p>
                                </div>
                                {rewriteIntensity === intensity.value && (
                                  <Check className={`w-6 h-6 text-${intensity.color}-600`} />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 리라이팅 결과 */}
                      {rewriteResult && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-800">리라이팅 결과</h4>
                          </div>
                          
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                            <p className="text-gray-800 font-medium text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                              "{rewriteResult.rewritten}"
                            </p>
                          </div>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={applyRewrite}
                              className="flex-1 flex items-center justify-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                            >
                              <Check className="w-5 h-5 mr-2" />
                              적용하기
                            </button>
                            <button
                              onClick={closeRewriteModal}
                              className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      {!rewriteResult && (
                        <div className="flex gap-3">
                          <button
                            onClick={handleRewrite}
                            disabled={!rewriteIntensity || isRewriting}
                            className="flex-1 flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                          >
                            {isRewriting ? (
                              <>
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                리라이팅 중...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-5 h-5 mr-2" />
                                리라이팅 시작
                              </>
                            )}
                          </button>
                          <button
                            onClick={closeRewriteModal}
                            className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 메모 모달 */}
            <AnimatePresence>
              {showMemoModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                  onClick={closeMemoModal}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                            <Edit3 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">대본 메모</h2>
                            <p className="text-gray-600">이 대본에 대한 메모를 작성해보세요</p>
                          </div>
                        </div>
                        <button
                          onClick={closeMemoModal}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-lg font-semibold text-gray-800">메모 내용</label>
                        <textarea
                          value={scriptMemo}
                          onChange={(e) => setScriptMemo(e.target.value)}
                          placeholder="이 대본에 대한 메모를 자유롭게 작성해보세요..."
                          className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={saveMemo}
                          disabled={isSavingMemo}
                          className="flex-1 flex items-center justify-center px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                        >
                          {isSavingMemo ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5 mr-2" />
                              저장하기
                            </>
                          )}
                        </button>
                        <button
                          onClick={closeMemoModal}
                          className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // 어린이 테마 선택 화면
  if (showChildrenThemeSelection) {
    return (
      <ChildrenThemeSelection
        childrenThemes={childrenThemes}
        onThemeSelect={handleChildrenThemeSelect}
        onBack={handleBackToTemplatesFromTheme}
      />
    );
  }

  // 동물 선택 화면
  if (showAnimalSelection) {
    return (
      <AnimalSelection
        availableAnimals={availableAnimals}
        selectedAnimals={selectedAnimals}
        onAnimalToggle={handleAnimalToggle}
        onAnimalPercentageChange={handleAnimalPercentageChange}
        onAnimalRoleChange={handleAnimalRoleChange}
        selectedScriptLength={selectedScriptLength}
        onScriptLengthChange={setSelectedScriptLength}
        lengths={lengths}
        isGenerating={isGenerating}
        progress={progress}
        onGenerate={handleAnimalSelectionComplete}
        onBack={handleBackToThemeFromAnimals}
        usageData={usageData}
        error={error}
      />
    );
  }

  // 기본 fallback (일반적으로 도달하지 않음)
  return (
    <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">어린이 연극 대본 생성</h1>
        <p className="text-gray-600 mb-8">테마를 선택하여 시작하세요.</p>
        <button
          onClick={() => setShowChildrenThemeSelection(true)}
          className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
        >
          테마 선택하기
        </button>
      </div>
    </div>
  );
};

export default ChildrenTheater;