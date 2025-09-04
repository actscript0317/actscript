import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, RotateCcw, Wand2, RefreshCw, Copy, Save, Archive, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../../components/common/Dropdown';
import ScriptRenderer from '../../components/common/ScriptRenderer';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AnimalSelection = () => {
  const { addSavedScript, user } = useAuth();
  const navigate = useNavigate();
  
  // 자체 상태 관리
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');
  const [isLengthDropdownOpen, setIsLengthDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');
  const [loadingUsage, setLoadingUsage] = useState(true);
  
  // 사용량 관리 상태
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

  // 동물 친구들 테마 정보
  const selectedTheme = {
    value: 'animal-friends',
    label: '동물 친구들',
    description: '토끼, 고양이, 강아지 등 귀여운 동물들이 등장하는 따뜻한 이야기',
    icon: '🐰',
    genre: '동물 친구들'
  };

  // 어린이 연극용 동물 캐릭터들 (스니펫 포함)
  const availableAnimals = [
    { 
      value: 'rabbit', 
      label: '토끼', 
      icon: '🐰', 
      personality: '활발하고 호기심 많은', 
      voiceStyle: '밝고 경쾌한',
      snippet: {
        exclamations: ['와!', '어?', '정말?'],
        actions: ['(귀 쫑긋)', '(깡충)', '(뛰어가며)'],
        characteristics: '빠른 반응으로 단서 발견',
        speechPattern: '감탄사를 자주 사용하며 빠르게 반응'
      }
    },
    { 
      value: 'cat', 
      label: '고양이', 
      icon: '🐱', 
      personality: '영리하고 독립적인', 
      voiceStyle: '우아하고 자신감 있는',
      snippet: {
        exclamations: ['흠.', '그래.', '알겠어.'],
        actions: ['(하품)', '(꼬리 살랑)', '(우아하게)'],
        characteristics: '건조·도도하지만 마지막에 다정',
        speechPattern: '짧고 또렷한 문장으로 말함'
      }
    },
    { 
      value: 'dog', 
      label: '강아지', 
      icon: '🐶', 
      personality: '충실하고 친근한', 
      voiceStyle: '따뜻하고 다정한',
      snippet: {
        exclamations: ['멍!', '아!', '미안해!'],
        actions: ['(꼬리 흔들며)', '(폴짝)', '(머리 긁적)'],
        characteristics: '약간의 실수와 사과로 유머 연출',
        speechPattern: '솔직한 한 문장으로 표현'
      }
    },
    { 
      value: 'bear', 
      label: '곰', 
      icon: '🐻', 
      personality: '다정하고 든든한', 
      voiceStyle: '깊고 안정감 있는',
      snippet: {
        exclamations: ['음.', '좋아.', '그렇구나.'],
        actions: ['(느릿 고개 끄덕)', '(따뜻한 미소)', '(든든하게)'],
        characteristics: '힘이 필요한 순간에 1회 해결',
        speechPattern: '길게 말하지 않고 간결하게'
      }
    },
    { 
      value: 'fox', 
      label: '여우', 
      icon: '🦊', 
      personality: '영리하고 재치있는', 
      voiceStyle: '똑똑하고 재빠른',
      snippet: {
        exclamations: ['아하!', '그럼!', '혹시?'],
        actions: ['(눈 반짝)', '(영리한 미소)', '(재치있게)'],
        characteristics: '재치 있는 한 줄로 상황 전환',
        speechPattern: '퀴즈식 제안을 자주 함'
      }
    },
    { 
      value: 'lion', 
      label: '사자', 
      icon: '🦁', 
      personality: '용감하고 당당한', 
      voiceStyle: '웅장하고 카리스마 있는',
      snippet: {
        exclamations: ['어흠!', '좋다!', '그래!'],
        actions: ['(가슴 펴며)', '(당당한 보폭)', '(위엄있게)'],
        characteristics: '선언형 문장으로 분위기 수습',
        speechPattern: '리더십을 발휘하는 당당한 말투'
      }
    },
    { 
      value: 'elephant', 
      label: '코끼리', 
      icon: '🐘', 
      personality: '지혜롭고 온화한', 
      voiceStyle: '느리고 심사숙고하는',
      snippet: {
        exclamations: ['음...', '그렇지.', '알겠구나.'],
        actions: ['(천천히 고개 끄덕)', '(코로 도움)', '(지혜롭게)'],
        characteristics: '요약·정리 대사를 한 줄로',
        speechPattern: '천천히 생각하며 지혜로운 조언'
      }
    },
    { 
      value: 'monkey', 
      label: '원숭이', 
      icon: '🐵', 
      personality: '장난기 많고 활동적인', 
      voiceStyle: '빠르고 장난스러운',
      snippet: {
        exclamations: ['야호!', '우키!', '재밌다!'],
        actions: ['(손뼉 치며)', '(성큼성큼)', '(장난스럽게)'],
        characteristics: '리듬을 주도하며 분위기 메이커',
        speechPattern: '짧은 반복어를 2회씩 사용'
      }
    },
    { 
      value: 'panda', 
      label: '판다', 
      icon: '🐼', 
      personality: '평화롭고 느긋한', 
      voiceStyle: '차분하고 온순한',
      snippet: {
        exclamations: ['호호.', '그래그래.', '괜찮아.'],
        actions: ['(배 두드리며)', '(느긋하게 손 흔들며)', '(여유롭게)'],
        characteristics: '긴장 완화용 유머 한 줄',
        speechPattern: '느긋하고 평화로운 분위기 조성'
      }
    },
    { 
      value: 'pig', 
      label: '돼지', 
      icon: '🐷', 
      personality: '순수하고 정직한', 
      voiceStyle: '단순하고 진실한',
      snippet: {
        exclamations: ['꿀꿀!', '배고파!', '맛있겠다!'],
        actions: ['(꿀꿀)', '(땅 파기)', '(솔직하게)'],
        characteristics: '솔직한 욕구 표현으로 단서 찾기',
        speechPattern: '직접적이고 솔직한 욕구 표현'
      }
    },
    { 
      value: 'chicken', 
      label: '닭', 
      icon: '🐔', 
      personality: '부지런하고 꼼꼼한', 
      voiceStyle: '정확하고 분명한',
      snippet: {
        exclamations: ['꼬끼오!', '시간이야!', '어서어서!'],
        actions: ['(날개 퍼덕)', '(바쁘게)', '(시계 보듯)'],
        characteristics: '시간 관리 신호와 큐 대사',
        speechPattern: '시간과 일정에 대한 명확한 안내'
      }
    },
    { 
      value: 'duck', 
      label: '오리', 
      icon: '🦆', 
      personality: '쾌활하고 사교적인', 
      voiceStyle: '명랑하고 수다스러운',
      snippet: {
        exclamations: ['꽥꽥!', '모두모두!', '함께해요!'],
        actions: ['(덩실덩실)', '(퍼덕퍼덕)', '(사교적으로)'],
        characteristics: '사회자 역할로 콜앤리스폰스 유도',
        speechPattern: '모두를 참여시키는 사회자 역할'
      }
    },
    { 
      value: 'sheep', 
      label: '양', 
      icon: '🐑', 
      personality: '온순하고 따뜻한', 
      voiceStyle: '부드럽고 다정한',
      snippet: {
        exclamations: ['메에~', '그래요.', '좋아요.'],
        actions: ['(끄덕끄덕)', '(가까이 다가가며)', '(따뜻하게)'],
        characteristics: '화해·연결을 위한 중재 대사',
        speechPattern: '부드럽고 화합을 이끄는 말투'
      }
    },
    { 
      value: 'horse', 
      label: '말', 
      icon: '🐴', 
      personality: '자유롭고 역동적인', 
      voiceStyle: '힘차고 활기찬',
      snippet: {
        exclamations: ['히힝!', '달려!', '가자!'],
        actions: ['(발굽 소리 흉내)', '(달려가는 제스처)', '(역동적으로)'],
        characteristics: '장면 전환의 에너지 역할',
        speechPattern: '역동적이고 행동력 있는 표현'
      }
    },
    { 
      value: 'turtle', 
      label: '거북이', 
      icon: '🐢', 
      personality: '신중하고 끈기있는', 
      voiceStyle: '느리고 차분한',
      snippet: {
        exclamations: ['음... 그래.', '천천히.', '결국은.'],
        actions: ['(천천히 한 박자 쉬고)', '(신중하게)', '(끈기있게)'],
        characteristics: '결론을 차분히 정리, 끈기 강조',
        speechPattern: '한 박자 쉬고 신중한 결론 제시'
      }
    },
    { 
      value: 'penguin', 
      label: '펭귄', 
      icon: '🐧', 
      personality: '사교적이고 협동적인', 
      voiceStyle: '재미있고 친근한',
      snippet: {
        exclamations: ['뿌뿌!', '함께!', '우리가!'],
        actions: ['(뒤뚱뒤뚱)', '(손잡기)', '(협동하며)'],
        characteristics: '협동 시작 신호, 합창 유도',
        speechPattern: '협동과 단결을 이끄는 표현'
      }
    }
  ];

  // 대본 길이 옵션
  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분 (약 12~16줄)', icon: '⚡', available: true },
    { value: 'medium', label: '중간', time: '3~5분 (약 25~35줄)', icon: '⏱️', available: true },
    { value: 'long', label: '길게', time: '5~10분 (약 50~70줄)', icon: '📝', available: true }
  ];

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      setLoadingUsage(true);
      const response = await api.get('/ai-script/usage');
      const { usage } = response.data;
      
      setUsageData({
        used: usage.currentMonth,
        limit: usage.limit,
        isPremium: true,
        isActive: true,
        canGenerate: usage.canGenerate,
        planType: 'test',
        nextResetDate: usage.nextResetDate,
        daysUntilReset: usage.daysUntilReset
      });
    } catch (error) {
      console.error('사용량 정보 로딩 실패:', error);
      setUsageData(prev => ({
        ...prev,
        used: user?.usage?.currentMonth || 0,
        limit: user?.usage?.monthly_limit || 10,
        isPremium: true,
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
  const totalPercentage = selectedAnimals.reduce((sum, animal) => sum + animal.percentage, 0);
  const isValid = selectedAnimals.length > 0 && totalPercentage === 100;

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
          percentage: Math.floor(100 / (prev.length + 1)),
          roleType: prev.length === 0 ? '주연' : '조연'
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

  // 비율 자동 균등 분배
  const handleAutoDistribute = () => {
    if (selectedAnimals.length === 0) return;
    
    const equalPercentage = Math.floor(100 / selectedAnimals.length);
    const remainder = 100 % selectedAnimals.length;
    
    setSelectedAnimals(prev => 
      prev.map((animal, index) => ({
        ...animal,
        percentage: index < remainder ? equalPercentage + 1 : equalPercentage
      }))
    );
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    navigate('/ai-script/children');
  };

  // 테마별 전용 프롬프트 생성
  const getThemePrompt = (theme, animals, scriptLength) => {
    const animalList = animals.map(a => `${a.name}(${a.label})`).join(', ');
    const animalDetails = animals.map(a => 
      `- ${a.name}(${a.label}): ${a.personality}, ${a.voiceStyle}, 역할: ${a.roleType}, 대사분량: ${a.percentage}%`
    ).join('\n');
    
    return `🎭 어린이 연극 "${theme?.label}" 테마 대본 생성

    당신은 어린이 연극을 전문적으로 작성하는 작가입니다. 아래의 조건에 맞춰서 퀄리티 높은 대본을 완성하세요
📝 기본 설정:
- 등장 동물: ${animalList}
- 대본 길이: ${lengths.find(l => l.value === scriptLength)?.label || '중간'}
- 연령대: 5-12세 어린이 대상
- 무대/소품 제약: {예: 숲 배경 1종, 소품 3개 이내(바구니, 밧줄, 깃발)}
- 문장 길이: **6~12어절**, 어려운 한자어·은유 최소화, 의성·의태어 활용.
- 갈등 단계: 시작(일상) → 문제(오해/난관) → 해결(협력/발견) → **메시지 명시**.
- 마지막 30초: “관객 참여”+“클로징 송” 가사 2연, 간단한 율동 지시 포함.
- 


🐾 동물 캐릭터 상세 정보 및 스니펫 (반드시 반영):
${animalDetails}

📝 각 동물별 필수 스니펫 (대본에 반드시 포함할 것):
${animals.map(animal => {
  const snippet = animal.snippet;
  return `${animal.name}(${animal.label}) 스니펫:
- 감탄사: ${snippet.exclamations.join(', ')} 
- 행동 지시문: ${snippet.actions.join(', ')}
- 캐릭터 특성: ${snippet.characteristics}
- 말투 패턴: ${snippet.speechPattern}`;
}).join('\n\n')}

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

    let progressInterval;

    try {
      // 테마별 전용 프롬프트 생성
      const themePrompt = getThemePrompt(
        selectedTheme, 
        selectedAnimals, 
        selectedScriptLength
      );

      // themePrompt는 백엔드로 전송만 하고, 실제 finalPrompt는 응답에서 받음
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
          voiceStyle: animal.voiceStyle,
          snippet: animal.snippet
        })),
        genre: selectedTheme?.genre || '동물 친구들',
        length: selectedScriptLength,
        age: 'children',
        gender: 'random'
      };

      console.log('🚀 대본 생성 요청 데이터:', requestData);

      let currentProgress = 0;
      progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setProgress(Math.min(currentProgress, 90));
      }, 500);

      const response = await api.post('/ai-script/children/generate', requestData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.data && response.data.success) {
        const scriptContent = typeof response.data.script === 'object' && response.data.script !== null ? 
                             response.data.script.content : response.data.script;
        
        setGeneratedScript(scriptContent);
        setGeneratedScriptId(response.data.script?.id || response.data.scriptId);
        
        // 백엔드에서 RAG로 향상된 최종 프롬프트 설정
        if (response.data.finalPrompt) {
          setFinalPrompt(response.data.finalPrompt);
        }
        
        toast.success('🎭 어린이 연극 대본이 생성되었습니다!');
        
        setTimeout(() => {
          setProgress(0);
          fetchUsageInfo();
        }, 1000);
      } else {
        console.error('응답 데이터 구조 확인:', response.data);
        throw new Error(response.data?.error || '서버에서 올바른 응답을 받지 못했습니다.');
      }
    } catch (error) {
      // progressInterval 정리
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      console.error('대본 생성 오류:', error);
      console.error('에러 상세 정보:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          '대본 생성 중 오류가 발생했습니다.';
      
      setError(errorMessage);
      setProgress(0);
      toast.error(errorMessage);
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
            <motion.button
              onClick={handleBack}
              className="absolute top-8 left-8 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </motion.button>

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
          <motion.button
            onClick={handleBack}
            className="absolute top-8 left-8 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </motion.button>

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
                      onClick={() => handleAnimalToggle(animal)}
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
                            onChange={(e) => handleAnimalRoleChange(animal.value, e.target.value)}
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
                            onChange={(e) => handleAnimalPercentageChange(animal.value, e.target.value)}
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
                    setSelectedScriptLength(length?.value || '');
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