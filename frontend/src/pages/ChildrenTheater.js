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

  // URL 경로에 따른 자동 테마 선택
  useEffect(() => {
    const path = location.pathname;
    const themeMap = {
      '/ai-script/children/animal-friends': 'animal-friends',
      '/ai-script/children/magic-adventure': 'magic-adventure',
      '/ai-script/children/friendship': 'friendship',
      '/ai-script/children/school-life': 'school-life',
      '/ai-script/children/dreams-imagination': 'dreams-imagination'
    };
    
    if (themeMap[path]) {
      const theme = childrenThemes.find(t => t.value === themeMap[path]);
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
    }
  }, [location]);

  // 어린이 연극 테마들 (AIScript.js에서 가져온 데이터)
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

  // 어린이 연극용 동물 캐릭터들 (AIScript.js에서 가져온 데이터)
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

  // 테마별 전용 프롬프트 (AIScript.js에서 가져온 함수)
  const getThemePrompt = (theme, animals, scriptLength) => {
    const animalList = animals.map(a => `${a.name}(${a.label})`).join(', ');
    const animalDetails = animals.map(a => 
      `- ${a.name}(${a.label}): ${a.personality}, ${a.voiceStyle}, 역할: ${a.roleType}, 대사분량: ${a.percentage}%`
    ).join('\n');
    
    const prompts = {
      'animal-friends': `
🎭 어린이 연극 "동물 친구들" 테마 대본 생성

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
- 교훈: 다름을 인정하고 서로 도우며 살아가는 지혜

💫 스토리 요소:
- 동물들 간의 갈등과 화해
- 각자의 특기를 살려 문제 해결
- 계절이나 자연 변화를 배경으로 한 모험
- 새로운 친구를 받아들이는 과정
- 함께 협력해서 이루는 작은 성취

🗣️ 대화 스타일:
- 각 동물의 성격에 맞는 말투와 어조
- 어린이가 이해하기 쉬운 단순하고 명확한 언어
- 의성어, 의태어를 활용한 생동감 있는 표현
- 긍정적이고 밝은 톤의 대화`,

      'magic-adventure': `
🎭 어린이 연극 "마법의 모험" 테마 대본 생성

📝 기본 설정:
- 등장인물 수: ${animals.length}명
- 대본 길이: ${scriptLength}
- 연령대: 5-12세 어린이 대상

✨ 마법 세계 캐릭터들:
${animalDetails.replace(/동물/g, '마법 생물')}

🔮 테마별 특성:
- 환상적이고 신비로운 마법 세계
- 선악이 명확하게 구분되는 모험담
- 마법 도구와 주문을 활용한 문제 해결
- 용기와 지혜를 통한 성장 스토리
- 교훈: 진정한 마법은 사랑과 우정에서 나온다

🌟 스토리 요소:
- 마법사, 요정, 용, 마법 동물들의 등장
- 마법의 숲, 성, 비밀 동굴 등 신비로운 배경
- 악의 세력에 맞서는 정의로운 모험
- 마법 아이템을 찾거나 저주를 풀어내는 퀘스트
- 마법 주문과 변신, 순간이동 등 환상적 요소

🗣️ 대화 스타일:
- 고풍스럽고 격조 있는 판타지 어조
- "그대", "~하시라" 같은 정중한 존댓말 사용
- 마법 주문과 신비로운 단어들 포함
- 웅장하고 모험적인 분위기의 대사`,

      'friendship': `
🎭 어린이 연극 "우정 이야기" 테마 대본 생성

📝 기본 설정:
- 등장인물 수: ${animals.length}명
- 대본 길이: ${scriptLength}
- 연령대: 5-12세 어린이 대상

👫 친구들 캐릭터 정보:
${animalDetails}

❤️ 테마별 특성:
- 진실한 우정의 소중함을 다루는 이야기
- 친구 간의 갈등과 화해 과정
- 서로 다른 개성을 인정하고 받아들이는 과정
- 어려움을 함께 극복하며 더욱 깊어지는 우정
- 교훈: 진정한 친구는 서로의 차이를 이해하고 도와준다

🌈 스토리 요소:
- 새 학기, 이사, 전학 등 새로운 환경에서의 만남
- 오해와 질투로 인한 갈등 상황
- 친구의 어려움을 함께 해결해나가는 과정
- 각자의 장점으로 서로를 도와주는 협력
- 축제, 경연대회 등을 함께 준비하며 쌓는 추억

🗣️ 대화 스타일:
- 솔직하고 진솔한 감정 표현
- 또래 아이들의 자연스러운 말투
- 고민을 털어놓고 위로하는 따뜻한 대화
- 때로는 투덜거리지만 결국 서로를 아끼는 마음이 드러나는 대사`,

      'school-life': `
🎭 어린이 연극 "학교 생활" 테마 대본 생성

📝 기본 설정:
- 등장인물 수: ${animals.length}명
- 대본 길이: ${scriptLength}
- 연령대: 5-12세 어린이 대상

🎒 학교 친구들 캐릭터 정보:
${animalDetails}

📚 테마별 특성:
- 학교에서 벌어지는 일상적이고 친근한 에피소드
- 공부, 놀이, 급식, 청소 등 학교생활의 다양한 면
- 선생님과 학생, 친구들 간의 따뜻한 관계
- 작은 실수와 성취를 통한 성장 스토리
- 교훈: 학교는 배움과 우정을 쌓는 소중한 공간

🏫 스토리 요소:
- 수업 시간의 재미있는 에피소드
- 운동회, 학예회, 소풍 등 학교 행사
- 숙제, 시험, 발표 등으로 인한 고민과 해결
- 급식실, 운동장, 도서관에서의 이야기
- 새 친구 사귀기, 단체 활동 참여하기

🗣️ 대화 스타일:
- 활발하고 생기 넘치는 어린이 특유의 말투
- "선생님!", "친구들아!" 같은 학교에서 쓰는 호칭
- 궁금증과 호기심이 가득한 질문들
- 때로는 장난스럽고 때로는 진지한 대화`,

      'dreams-imagination': `
🎭 어린이 연극 "꿈과 상상" 테마 대본 생성

📝 기본 설정:
- 등장인물 수: ${animals.length}명
- 대본 길이: ${scriptLength}
- 연령대: 5-12세 어린이 대상

🌟 꿈꾸는 아이들 캐릭터 정보:
${animalDetails}

✨ 테마별 특성:
- 무한한 상상력과 창의성을 펼치는 이야기
- 현실과 환상이 어우러진 신비로운 세계
- 각자의 꿈과 희망을 표현하고 응원하는 과정
- 불가능해 보이는 일들을 상상력으로 해결
- 교훈: 꿈과 상상력은 세상을 바꾸는 힘이 된다

🎨 스토리 요소:
- 구름 위의 성, 별나라, 무지개 다리 등 환상적 배경
- 시간 여행, 크기 변화, 하늘 날기 등 상상 속 모험
- 꿈 속에서 만나는 신비로운 존재들
- 그림, 음악, 이야기 창작 등 예술 활동
- 작은 아이디어가 큰 변화를 만들어내는 과정

🗣️ 대화 스타일:
- 풍부한 상상력이 느껴지는 창의적인 표현
- "만약에...", "상상해봐!" 같은 가정법 문장
- 비유와 은유가 가득한 시적인 대사
- 꿈꾸는 듯한 몽환적이고 따뜻한 어조`
    };

    return prompts[theme] || prompts['animal-friends'];
  };

  // 어린이 테마 선택 핸들러 (하위 페이지로 네비게이션)
  const handleChildrenThemeSelect = (themeValue) => {
    navigate(`/ai-script/children/${themeValue}`);
  };

  // 동물 선택 핸들러 (AIScript.js에서 가져온 함수)
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

  // 동물 선택 완료 및 대본 생성 핸들러 (AIScript.js에서 가져온 함수)
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

    // 선택된 동물들을 캐릭터로 변환
    const animalCharacters = selectedAnimals.map((animal, index) => ({
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
    }));

    // 바로 대본 생성 시작
    setError('');
    setIsGenerating(true);
    setGeneratedScript('');
    setProgress(0);

    try {
      // 테마별 전용 프롬프트 생성
      const themePrompt = getThemePrompt(
        selectedChildrenTheme.value, 
        selectedAnimals, 
        lengths.find(l => l.value === selectedScriptLength)?.label || '중간'
      );

      // 최종 프롬프트 저장 (화면에 표시용)
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

      console.log('🎭 전체 응답 데이터:', response.data);
      
      if (response.data && response.data.script) {
        const scriptContent = response.data.script.content || response.data.script;
        console.log('🎭 생성된 대본 내용:', scriptContent);
        console.log('🎭 대본 길이:', scriptContent?.length);
        
        setGeneratedScript(scriptContent);
        console.log('🎭 setGeneratedScript 호출 완료');
        
        setGeneratedScriptId(response.data.script.id); // 스크립트 ID 저장
        toast.success('🎭 어린이 연극 대본이 생성되었습니다!');
        
        // 동물 선택 화면에서 그대로 대본 표시 - 화면 전환하지 않음
        
        // 사용량 정보 업데이트
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

  // 동물 선택에서 테마로 돌아가기
  const handleBackToThemeFromAnimals = () => {
    setShowAnimalSelection(false);
    setShowChildrenThemeSelection(true);
    setSelectedAnimals([]);
  };

  // 어린이 테마 선택 페이지에서 템플릿으로 돌아가기
  const handleBackToTemplatesFromTheme = () => {
    navigate('/ai-script');
  };

  // 텍스트 선택 핸들러
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection.toString().trim();
    
    if (selected && selected.length > 5) { // 최소 5자 이상 선택
      // 선택된 텍스트를 원본 스크립트에서 찾기
      const scriptText = generatedScript;
      let startIndex = scriptText.indexOf(selected);
      
      if (startIndex === -1) {
        const normalizedSelected = selected.replace(/\s+/g, ' ').trim();
        const normalizedScript = scriptText.replace(/\s+/g, ' ');
        const normalizedIndex = normalizedScript.indexOf(normalizedSelected);
        
        if (normalizedIndex !== -1) {
          let charCount = 0;
          for (let i = 0; i < scriptText.length; i++) {
            if (charCount === normalizedIndex) {
              startIndex = i;
              break;
            }
            if (!/\s/.test(scriptText[i]) || scriptText[i] === ' ') {
              charCount++;
            }
          }
        }
      }
      
      if (startIndex !== -1) {
        const endIndex = startIndex + selected.length;
        setSelectedText(selected);
        setSelectedTextStart(startIndex);
        setSelectedTextEnd(endIndex);
        setShowRewriteModal(true);
        setRewriteIntensity('');
        setRewriteResult(null);
      } else {
        toast.error('선택된 텍스트를 찾을 수 없습니다. 다시 선택해주세요.');
      }
    }
  };

  // 리라이팅 API 호출
  const handleRewrite = async () => {
    if (!selectedText || !rewriteIntensity) {
      toast.error('텍스트가 선택되지 않았거나 리라이팅 강도를 선택해주세요.');
      return;
    }

    setIsRewriting(true);

    try {
      const contextBefore = generatedScript.substring(Math.max(0, selectedTextStart - 200), selectedTextStart);
      const contextAfter = generatedScript.substring(selectedTextEnd, Math.min(generatedScript.length, selectedTextEnd + 200));
      const fullContext = contextBefore + "[선택된 부분: " + selectedText + "]" + contextAfter;
      
      const response = await api.post('/ai-script/rewrite', {
        selectedText,
        intensity: rewriteIntensity,
        context: fullContext,
        fullScript: generatedScript,
        genre: formData.genre,
        gender: formData.gender
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.error || '리라이팅에 실패했습니다.');
      }

      setRewriteResult(data);

    } catch (error) {
      console.error('리라이팅 오류:', error);
      toast.error(error.message || '리라이팅 중 오류가 발생했습니다.');
    } finally {
      setIsRewriting(false);
    }
  };

  // 리라이팅 결과 적용
  const applyRewrite = () => {
    if (!rewriteResult) return;

    const beforeText = generatedScript.substring(0, selectedTextStart);
    const afterText = generatedScript.substring(selectedTextEnd);
    const newScript = beforeText + rewriteResult.rewritten + afterText;
    
    setGeneratedScript(newScript);
    setShowRewriteModal(false);
    setSelectedText('');
    setSelectedTextStart(0);
    setSelectedTextEnd(0);
    setRewriteResult(null);
    setRewriteIntensity('');
  };

  // 대본 파싱 및 렌더링 함수 (AIScript.js에서 가져온 함수)
  const parseAndRenderScript = (script) => {
    if (!script || typeof script !== 'string') return null;

    const lines = script.split('\n');
    const sections = [];
    let currentSection = { type: 'text', content: [] };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 섹션 헤더 감지
      if (trimmedLine.match(/^===제목===$/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'title', content: [line] };
      } else if (trimmedLine.match(/^===상황[ ]?설명===$/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'situation', content: [line] };
      } else if (trimmedLine.match(/^===등장인물===$/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'characters', content: [line] };
      } else if (trimmedLine.match(/^===대본===$/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'script', content: [line] };
      } else {
        currentSection.content.push(line);
      }
    });
    
    if (currentSection.content.length > 0) sections.push(currentSection);

    return sections.map((section, sectionIndex) => {
      const content = section.content.slice(1); // 첫 번째 라인(헤더) 제외
      
      if (section.type === 'title') {
        return (
          <div key={sectionIndex} className="mb-6">
            <div className="font-bold text-2xl text-center text-purple-800 mb-4 pb-2 border-b-2 border-purple-200">
              제목
            </div>
            <div className="text-xl font-bold text-center text-gray-800">
              {content.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        );
      }
      
      if (section.type === 'situation') {
        return (
          <div key={sectionIndex} className="mb-6">
            <div className="font-bold text-lg text-blue-700 mb-3 pb-1 border-b border-blue-200">
              상황 설명
            </div>
            <div className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
              {content.map((line, i) => (
                <div key={i} className="mb-1">{line}</div>
              ))}
            </div>
          </div>
        );
      }
      
      if (section.type === 'characters') {
        return (
          <div key={sectionIndex} className="mb-6">
            <div className="font-bold text-lg text-green-700 mb-3 pb-1 border-b border-green-200">
              등장인물
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              {content.map((line, i) => {
                if (line.includes(':') || line.includes('：')) {
                  const [name, description] = line.split(/[:：]/);
                  return (
                    <div key={i} className="mb-2">
                      <span className="font-semibold text-green-800">{name.trim()}:</span>
                      <span className="ml-2 text-gray-700">{description.trim()}</span>
                    </div>
                  );
                }
                return <div key={i} className="mb-1 text-gray-700">{line}</div>;
              })}
            </div>
          </div>
        );
      }
      
      if (section.type === 'script') {
        return (
          <div key={sectionIndex} className="mb-6">
            <div className="font-bold text-lg text-purple-700 mb-3 pb-1 border-b border-purple-200">
              대본
            </div>
            <div className="space-y-3">
              {content.map((line, i) => {
                if (!line.trim()) return <div key={i} className="mb-2"></div>;
                
                // 캐릭터 대사 처리
                if (line.includes(':') || line.includes('：')) {
                  const [speaker, ...dialogueParts] = line.split(/[:：]/);
                  const dialogue = dialogueParts.join(':').trim();
                  
                  if (speaker && dialogue) {
                    return (
                      <div key={i} className="bg-white rounded-lg p-3 border-l-4 border-purple-300 shadow-sm">
                        <span className="font-semibold text-purple-700 text-sm">{speaker.trim()}</span>
                        <div className="text-gray-800 mt-1 leading-relaxed">{dialogue}</div>
                      </div>
                    );
                  }
                }
                
                // 무대 지시문이나 기타 텍스트
                if (line.startsWith('(') && line.endsWith(')')) {
                  return (
                    <div key={i} className="text-center text-sm text-gray-500 italic bg-gray-50 py-2 px-4 rounded-lg mx-8">
                      {line}
                    </div>
                  );
                }
                
                return (
                  <div key={i} className="text-gray-700 leading-relaxed pl-4">
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      
      // 기본 텍스트 섹션
      return (
        <div key={sectionIndex} className="mb-4">
          {content.map((line, i) => (
            <div key={i} className="mb-1 text-gray-700 leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      );
    });
  };

  // 어린이 테마 선택 렌더링 (AIScript.js에서 가져온 함수)
  const renderChildrenThemeSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 헤더 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {/* 뒤로가기 버튼 */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleBackToTemplatesFromTheme}
                className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>템플릿 다시 선택</span>
              </button>
            </div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl mb-6 shadow-lg">
              <span className="text-3xl">🧒</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              🎭 어린이 연극 테마 선택
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              아이들이 좋아할 만한 테마를 선택해주세요
            </p>
          </motion.div>

          {/* 테마 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {childrenThemes.map((theme, index) => (
              <motion.div
                key={theme.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleChildrenThemeSelect(theme.value)}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                <div className="text-center space-y-4">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {theme.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {theme.label}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {theme.description}
                  </p>
                  
                  <div className="pt-4">
                    <div className="bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold group-hover:from-pink-500 group-hover:to-purple-500 group-hover:text-white transition-colors">
                      이 테마 선택하기
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 안내 메시지 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="bg-white rounded-xl shadow-md p-6 mx-auto max-w-2xl">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="text-2xl">🌟</span>
                <span className="font-semibold text-gray-900">어린이 연극의 특징</span>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <div>✨ <strong>교육적 가치:</strong> 재미와 함께 도덕적 교훈을 전달</div>
                <div>🎈 <strong>안전한 내용:</strong> 폭력적이거나 무서운 요소 없이 구성</div>
                <div>🌈 <strong>긍정적 메시지:</strong> 우정, 협력, 나눔의 가치 강조</div>
                <div>🎪 <strong>연기하기 쉬움:</strong> 어린이가 이해하고 연기하기 쉬운 대사</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  // 동물 선택 렌더링 (AIScript.js에서 가져온 함수)
  const renderAnimalSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-4 sm:py-8 md:py-12">
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
                onClick={handleBackToThemeFromAnimals}
                className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>테마 다시 선택</span>
              </button>
            </div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl mb-6 shadow-lg">
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
                      ? 'border-pink-400 bg-pink-50 shadow-lg' 
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="text-center space-y-2">
                    <div className="text-4xl mb-2">{animal.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm">{animal.label}</div>
                    <div className="text-xs text-gray-500">{animal.personality}</div>
                    {isSelected && (
                      <div className="flex items-center justify-center">
                        <Check className="w-5 h-5 text-pink-600" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 선택된 동물들 관리 */}
          {selectedAnimals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                선택된 동물들 ({selectedAnimals.length}마리)
              </h3>
              
              {/* 총 대사 분량 표시 바 */}
              <div className={`border rounded-lg p-4 mb-6 ${
                selectedAnimals.reduce((sum, animal) => sum + (animal.percentage || 0), 0) === 100
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    selectedAnimals.reduce((sum, animal) => sum + (animal.percentage || 0), 0) === 100
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    총 대사 분량 
                    {selectedAnimals.reduce((sum, animal) => sum + (animal.percentage || 0), 0) === 100 
                      ? ' ✅ 완료' 
                      : ' ⚠️ 조정 필요'
                    }
                  </span>
                  <span className={`text-lg font-bold ${
                    selectedAnimals.reduce((sum, animal) => sum + (animal.percentage || 0), 0) === 100
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {selectedAnimals.reduce((sum, animal) => sum + (animal.percentage || 0), 0)}% / 100%
                  </span>
                </div>
              </div>

              {/* 동물별 설정 - 한 줄에 5개까지 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                {selectedAnimals.map((animal, index) => (
                  <div key={animal.value} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex flex-col items-center mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mb-2">
                        <span className="text-xl">{animal.icon}</span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 text-sm">{animal.label}</h4>
                        <p className="text-xs text-gray-600">{animal.personality}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* 역할 선택 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">역할</label>
                        <select
                          value={animal.roleType}
                          onChange={(e) => handleAnimalRoleChange(animal.value, e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                        >
                          <option value="주연">주연</option>
                          <option value="조연">조연</option>
                          <option value="단역">단역</option>
                        </select>
                      </div>
                      
                      {/* 대사 분량 슬라이더 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          분량: {animal.percentage}%
                        </label>
                        
                        {/* 통합된 게이지 슬라이더 */}
                        <div className="relative mb-2">
                          <input
                            type="range"
                            min="5"
                            max="90"
                            step="5"
                            value={animal.percentage || 0}
                            onChange={(e) => handleAnimalPercentageChange(animal.value, e.target.value)}
                            className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #10b981 0%, #10b981 ${animal.percentage}%, #e5e7eb ${animal.percentage}%, #e5e7eb 100%)`
                            }}
                          />
                          {/* 퍼센트 표시 */}
                          <div 
                            className="absolute top-0 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center pointer-events-none"
                            style={{ width: `${animal.percentage}%` }}
                          >
                            <span className="text-white text-xs font-bold">
                              {animal.percentage}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>5%</span>
                          <span>90%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 대본 길이 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">대본 길이</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {lengths.map((length) => (
                    <button
                      key={length.value}
                      onClick={() => setSelectedScriptLength(length.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedScriptLength === length.value
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{length.icon}</span>
                        <div>
                          <div className="font-medium">{length.label}</div>
                          <div className="text-xs text-gray-500">{length.time}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <div className="text-center">
                <button
                  onClick={handleAnimalSelectionComplete}
                  disabled={isGenerating}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
          <div className="flex items-center space-x-3">
            {!usageData.isPremium && usageData.limit && usageData.limit !== '무제한' && (
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((usageData.used / usageData.limit) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
            {usageData.daysUntilReset > 0 && (
              <div className="text-xs text-gray-500">
                {usageData.daysUntilReset}일 후 리셋
              </div>
            )}
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
                className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mb-4"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900">🎭 어린이 연극 대본 생성 중...</h3>
              <p className="text-gray-600 mt-2">AI가 창의적이고 교육적인 대본을 작성하고 있어요</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <motion.div
                className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full"
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
                       className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl mb-4 shadow-lg"
                     >
                       <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                     </motion.div>
                     <h2 className="text-3xl font-bold text-gray-900 mb-2">🎭 어린이 연극 대본 생성 완료!</h2>
                     <p className="text-gray-600">생성된 대본을 확인하고 아이들과 함께 연습해보세요.</p>
                   </div>

                   <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 sm:p-4 md:p-6 border border-pink-200 mb-4 sm:mb-6">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                       <h3 className="text-lg font-semibold text-purple-800">🧒 어린이 연극 대본</h3>
                       <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                         <span className="px-2 py-1 sm:px-3 bg-pink-100 text-pink-700 rounded-full">
                           {selectedChildrenTheme?.label || '어린이'}
                         </span>
                         <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                           {selectedAnimals.length}마리
                         </span>
                         <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                           {lengths.find(l => l.value === selectedScriptLength)?.label}
                         </span>
                       </div>
                     </div>
                     
                     <div className="mb-4 p-3 bg-white bg-opacity-60 border border-pink-200 rounded-lg">
                       <div className="flex items-start sm:items-center text-purple-700">
                         <RefreshCw className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                         <span className="text-xs sm:text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다</span>
                       </div>
                     </div>
                     
                     <div 
                       className="bg-white rounded-lg p-3 sm:p-4 md:p-6 border border-pink-200 max-h-[70vh] overflow-y-auto cursor-text select-text text-sm sm:text-base leading-relaxed shadow-inner"
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

                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
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
                       onClick={() => setShowMemoModal(true)}
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

      {/* 리라이팅 모달 */}
      <AnimatePresence>
        {showRewriteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">✨ 대사 리라이팅</h3>
                  <button
                    onClick={() => setShowRewriteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">선택된 텍스트:</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-800">{selectedText}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">리라이팅 강도:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: '살짝 변경', description: '어투나 표현만 조금 수정' },
                      { value: 'medium', label: '적당히 변경', description: '문장 구조나 단어 선택 개선' },
                      { value: 'heavy', label: '많이 변경', description: '완전히 다른 방식으로 표현' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setRewriteIntensity(option.value)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          rewriteIntensity === option.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {rewriteResult && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">리라이팅 결과:</label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-800">{rewriteResult.rewritten}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRewrite}
                    disabled={!rewriteIntensity || isRewriting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {isRewriting ? '리라이팅 중...' : '✨ 리라이팅 하기'}
                  </button>
                  
                  {rewriteResult && (
                    <button
                      onClick={applyRewrite}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✅ 적용하기
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowRewriteModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">📝 대본 메모</h3>
                  <button
                    onClick={() => setShowMemoModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">메모 내용:</label>
                  <textarea
                    value={scriptMemo}
                    onChange={(e) => setScriptMemo(e.target.value)}
                    placeholder="대본에 대한 메모를 작성해주세요. (연출 노트, 캐릭터 해석, 소품 목록 등)"
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={async () => {
                      // 메모 저장 로직
                      setIsSavingMemo(true);
                      try {
                        // API 호출 로직 (실제 구현 시)
                        toast.success('메모가 저장되었습니다!');
                        setShowMemoModal(false);
                      } catch (error) {
                        toast.error('메모 저장에 실패했습니다.');
                      } finally {
                        setIsSavingMemo(false);
                      }
                    }}
                    disabled={isSavingMemo || !scriptMemo.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {isSavingMemo ? '저장 중...' : '💾 메모 저장'}
                  </button>
                  
                  <button
                    onClick={() => setShowMemoModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
  );
};

export default ChildrenTheater;