import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  FileText
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ChildrenThemeSelection from './ai-script/ChildrenThemeSelection';
import AnimalSelection from './ai-script/AnimalSelection';
import ScriptRenderer from '../components/common/ScriptRenderer';
import Dropdown from '../components/common/Dropdown';

const AIScript = () => {
  const { addSavedScript, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    template: '', // 템플릿 선택
    characterCount: '1',
    genre: '',
    length: '',
    gender: '',
    age: '',
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
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  
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
  const [showTemplateSelection, setShowTemplateSelection] = useState(true);
  
  // 템플릿 선택 상태 관리
  const [selectedTemplate, setSelectedTemplate] = useState({ value: 'general', label: '일반 대본' });
  const [showChildrenThemeSelection, setShowChildrenThemeSelection] = useState(false);
  const [selectedChildrenTheme, setSelectedChildrenTheme] = useState(null);
  const [showAnimalSelection, setShowAnimalSelection] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');
  const [progress, setProgress] = useState(0);
  
  // 드롭다운 상태 관리
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [isLengthDropdownOpen, setIsLengthDropdownOpen] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);
  const [isCharacterCountDropdownOpen, setIsCharacterCountDropdownOpen] = useState(false);

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

  // URL 경로에서 템플릿 자동 선택
  useEffect(() => {
    const path = location.pathname;
    let templateType = 'general'; // 기본값
    
    if (path === '/ai-script/general') {
      templateType = 'general';
    } else if (path === '/ai-script/school') {
      templateType = 'school';
    } else if (path === '/ai-script/family') {
      templateType = 'family';
    }
    
    // 템플릿에 따른 기본 설정
    const templateSettings = {
      general: { template: 'general' },
      school: { 
        template: 'school', 
        age: 'kids', 
        genre: '학교 생활', 
        length: 'medium',
        characterCount: '3'
      },
      family: { 
        template: 'family', 
        age: 'random', 
        genre: '가족 이야기', 
        length: 'medium',
        characterCount: '4'
      }
    };
    
    // 폼 데이터 설정
    setFormData(prev => ({
      ...prev,
      ...templateSettings[templateType]
    }));
    
    // 템플릿 선택 화면 건너뛰기
    setShowTemplateSelection(false);
    
  }, [location]);

  // 옵션 데이터 (모든 사용자에게 전체 기능 제공)
  const characterOptions = [
    { value: '1', label: '1인 독백', icon: '👤', available: true },
    { value: '2', label: '2인 대화', icon: '👥', available: true, premium: false },
    { value: '3', label: '3인 대화', icon: '👥', available: true, premium: false },
    { value: '4', label: '4인 앙상블', icon: '👨‍👩‍👧‍👦', available: true, premium: false }
  ];

  const freeGenres = ['로맨스','비극', '코미디', '드라마'];
  const premiumGenres = ['스릴러', '액션', '공포', '판타지', 'SF', '미스터리', '시대극'];
  const childrenGenres = ['동물 친구들', '마법의 세계', '우정과 모험', '학교 생활', '가족 이야기', '꿈과 상상'];
  const genres = [...freeGenres, ...premiumGenres, ...childrenGenres];

  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분 (약 12~16줄)', icon: '⚡', available: true },
    { value: 'medium', label: '중간', time: '3~5분 (약 25~35줄)', icon: '⏱️', available: true, premium: false },
    { value: 'long', label: '길게', time: '5~10분 (약 50~70줄)', icon: '📝', available: true, premium: false }
  ];


  const genders = [
    { value: 'male', label: '남자', icon: '👨' },
    { value: 'female', label: '여자', icon: '👩' },
    { value: 'random', label: '랜덤', icon: '🎲' }
  ];

  const ages = [
    { value: 'children', label: '어린이 (5~9세)', description: '순수하고 상상력 넘치는 어린이', icon: '🧒' },
    { value: 'kids', label: '초등학생 (10~12세)', description: '호기심 많고 활발한 초등학생', icon: '🎒' },
    { value: 'teens', label: '10대', description: '청소년기 고민과 생동감', icon: '🎓' },
    { value: '20s', label: '20대', description: '사회 초년생의 열정과 방황', icon: '🌟' },
    { value: '30s-40s', label: '30~40대', description: '성숙한 어른의 현실적 고민', icon: '💼' },
    { value: '50s', label: '50대', description: '중년의 깊이 있는 성찰', icon: '🎯' },
    { value: '70s+', label: '70대 이상', description: '인생 경험과 지혜', icon: '🎋' },
    { value: 'random', label: '랜덤', description: '10대, 20대, 30대, 40대, 50대, 70+대 중 랜덤', icon: '🎲' }
  ];

  const roleTypes = [
    { value: '주연', label: '주연', description: '이야기의 중심 인물', icon: '⭐' },
    { value: '조연', label: '조연', description: '주연을 보조하는 역할', icon: '🎭' },
    { value: '단역', label: '단역', description: '특정 장면에서만 등장', icon: '🎪' },
    { value: '주조연', label: '주조연', description: '주연급 조연 역할', icon: '🌟' }
  ];

  // 인물 간 이해관계 옵션
  const relationshipTypes = [
    { value: '연인', label: '연인', description: '서로 사랑하는 관계', icon: '💕' },
    { value: '친구', label: '친구', description: '친밀한 우정 관계', icon: '👫' },
    { value: '가족', label: '가족', description: '혈연 또는 가족 관계', icon: '👨‍👩‍👧‍👦' },
    { value: '경쟁자', label: '경쟁자', description: '서로 경쟁하는 관계', icon: '⚔️' },
    { value: '상사부하', label: '상사-부하', description: '직장 내 상하관계', icon: '👔' },
    { value: '스승제자', label: '스승-제자', description: '가르치고 배우는 관계', icon: '📚' },
    { value: '적대관계', label: '적대관계', description: '서로 대립하는 관계', icon: '😤' },
    { value: '모르는사이', label: '모르는 사이', description: '처음 만나는 관계', icon: '❓' }
  ];

  // 템플릿 옵션들
  const templates = [
    { 
      value: 'general', 
      label: '일반 대본', 
      description: '모든 연령대를 위한 범용 대본', 
      icon: '🎭',
      defaultSettings: {} 
    },
    { 
      value: 'children', 
      label: '어린이 연극', 
      description: '5~12세 어린이를 위한 교육적이고 재미있는 연극', 
      icon: '🧒',
      defaultSettings: {
        age: 'children',
        genre: '동물 친구들',
        length: 'short',
        characterCount: '2'
      }
    },
    { 
      value: 'school', 
      label: '학교 연극', 
      description: '학교 발표회나 연극제를 위한 교육적 대본', 
      icon: '🎒',
      defaultSettings: {
        age: 'kids',
        genre: '학교 생활',
        length: 'medium',
        characterCount: '3'
      }
    },
    { 
      value: 'family', 
      label: '가족 연극', 
      description: '온 가족이 함께 즐길 수 있는 따뜻한 이야기', 
      icon: '👨‍👩‍👧‍👦',
      defaultSettings: {
        age: 'random',
        genre: '가족 이야기',
        length: 'medium',
        characterCount: '4'
      }
    }
  ];

  // 연령대 매핑 (템플릿에서 사용)
  const ageMap = {
    'children': '어린이 (5~9세)',
    'kids': '초등학생 (10~12세)',
    'teens': '10대',
    '20s': '20대', 
    '30s-40s': '30~40대',
    '50s': '50대',
    '70s+': '70대 이상',
    'random': '랜덤'
  };

  // 어린이 연극 테마들
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

  // 테마별 전용 프롬프트
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

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (templateValue) => {
    const template = templates.find(t => t.value === templateValue);
    setSelectedTemplate(template);
    
    // 어린이 연극을 선택한 경우 테마 선택 페이지로 이동
    if (templateValue === 'children') {
      setShowTemplateSelection(false);
      setShowChildrenThemeSelection(true);
      setFormData(prev => ({
        ...prev,
        template: templateValue,
        age: 'children', // 어린이 연령으로 고정
        length: 'short' // 짧은 길이로 기본 설정
      }));
    } else {
      // 다른 템플릿의 경우 바로 옵션 설정 페이지로 이동
      if (template && template.defaultSettings) {
        setFormData(prev => ({
          ...prev,
          template: templateValue,
          ...template.defaultSettings
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          template: templateValue
        }));
      }
      setShowTemplateSelection(false);
      setShowChildrenThemeSelection(false);
    }
  };

  // 어린이 테마 선택 핸들러
  const handleChildrenThemeSelect = (themeValue) => {
    const theme = childrenThemes.find(t => t.value === themeValue);
    setSelectedChildrenTheme(theme);
    
    setFormData(prev => ({
      ...prev,
      genre: theme.genre,
      characterCount: '2' // 기본 2명으로 설정
    }));
    
    // 동물 친구들 테마인 경우 동물 선택 페이지로 이동
    if (themeValue === 'animal-friends') {
      setShowChildrenThemeSelection(false);
      setShowAnimalSelection(true);
    } else {
      // 다른 테마는 바로 옵션 설정 페이지로
      setShowChildrenThemeSelection(false);
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

  // 템플릿 선택 페이지로 돌아가기 (옵션 설정 페이지에서)
  const handleBackToTemplates = () => {
    // AIScript 메인 페이지로 이동
    navigate('/ai-script');
  };

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // 인물 수가 변경될 때 characters 배열 초기화/업데이트
      if (field === 'characterCount') {
        const count = parseInt(value);
        if (count === 1) {
          newData.characters = [];
        } else if (count > 1) {
          const newCharacters = [];
          // 각 인물에게 균등하게 퍼센트 배분
          const equalPercentage = Math.floor(100 / count);
          const remainder = 100 - (equalPercentage * count);
          
          for (let i = 0; i < count; i++) {
            newCharacters.push({
              name: `인물 ${i + 1}`,
              gender: '',
              age: '',
              roleType: i === 0 ? '주연' : '조연', // 첫 번째 인물은 주연, 나머지는 조연
              percentage: i === 0 ? equalPercentage + remainder : equalPercentage, // 첫 번째 인물에게 나머지 퍼센트 추가
              relationshipWith: i === 0 ? '' : '인물 1', // 관계를 맺을 상대방 인물
              relationshipType: i === 0 ? '' : '친구' // 관계 유형
            });
          }
          newData.characters = newCharacters;
        }
      }
      
      return newData;
    });
  };

  // 개별 인물 설정 변경 핸들러
  const handleCharacterChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters.map((char, i) => 
        i === index ? { ...char, [field]: value } : char
      )
    }));
  };

  // 커스텀 프롬프트에서 / 태그 처리
  const handleCustomPromptChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setCursorPosition(cursorPos);
    handleInputChange('customPrompt', value);
    
    // / 문자 뒤에 인물 이름 자동완성 체크
    const beforeCursor = value.slice(0, cursorPos);
    const lastSlash = beforeCursor.lastIndexOf('/');
    
    if (lastSlash !== -1) {
      const afterSlash = beforeCursor.slice(lastSlash + 1);
      // /문자 바로 뒤이고 공백이 없으면 자동완성 패널 표시
      if (afterSlash.length >= 0 && !afterSlash.includes(' ')) {
        setShowCharacterPanel(true);
      } else {
        setShowCharacterPanel(false);
      }
    } else {
      setShowCharacterPanel(false);
    }
  };

  // 사이드 패널에서 인물 선택 시 프롬프트에 삽입
  const insertCharacterTag = (characterName) => {
    if (!textareaRef) return;
    
    const currentValue = formData.customPrompt;
    const cursorPos = textareaRef.selectionStart || cursorPosition;
    
    // 커서 위치에 태그 삽입
    const beforeCursor = currentValue.slice(0, cursorPos);
    const afterCursor = currentValue.slice(cursorPos);
    
    const newValue = beforeCursor + `/${characterName} ` + afterCursor;
    handleInputChange('customPrompt', newValue);
    
    // 커서 위치 업데이트
    setTimeout(() => {
      const newCursorPos = cursorPos + characterName.length + 2;
      textareaRef.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.focus();
    }, 0);
  };

  // / 태그 자동완성에서 인물 선택
  const selectCharacterFromAutocomplete = (characterName) => {
    if (!textareaRef) return;
    
    const currentValue = formData.customPrompt;
    const cursorPos = textareaRef.selectionStart || cursorPosition;
    
    // 마지막 / 위치 찾기
    const beforeCursor = currentValue.slice(0, cursorPos);
    const lastSlash = beforeCursor.lastIndexOf('/');
    
    if (lastSlash !== -1) {
      const beforeSlash = currentValue.slice(0, lastSlash);
      const afterCursor = currentValue.slice(cursorPos);
      
      // / 없이 인물 이름만 삽입 (태그 완료)
      const newValue = beforeSlash + `${characterName} ` + afterCursor;
      handleInputChange('customPrompt', newValue);
      
      // 커서 위치 업데이트
      setTimeout(() => {
        const newCursorPos = lastSlash + characterName.length + 1;
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.focus();
      }, 0);
    }
    
    setShowCharacterPanel(false);
  };

  // 태그된 인물을 클릭했을 때 실제 이름으로 변경
  const selectTaggedCharacter = (tag, index) => {
    const tagName = tag.substring(1).trim(); // /를 제거한 이름
    const isValidTag = formData.characters.some(char => char.name === tagName);
    
    if (isValidTag) {
      // /인물이름을 실제 인물이름으로 바꿈 (정확한 매칭을 위해 전역 교체 사용)
      const tagRegex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'g');
      const newValue = formData.customPrompt.replace(tagRegex, tagName);
      handleInputChange('customPrompt', newValue);
    }
  };


  // 텍스트 선택 핸들러
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection.toString().trim();
    
    if (selected && selected.length > 5) { // 최소 5자 이상 선택
      // 선택된 텍스트를 원본 스크립트에서 찾기 (여러 가능한 위치 고려)
      const scriptText = generatedScript;
      let startIndex = scriptText.indexOf(selected);
      
      // 만약 찾지 못했다면, 공백이나 특수문자 차이 때문일 수 있으므로 정규화 후 재시도
      if (startIndex === -1) {
        const normalizedSelected = selected.replace(/\s+/g, ' ').trim();
        const normalizedScript = scriptText.replace(/\s+/g, ' ');
        const normalizedIndex = normalizedScript.indexOf(normalizedSelected);
        
        if (normalizedIndex !== -1) {
          // 정규화된 위치를 원본 텍스트 위치로 변환
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
      // 선택된 텍스트 주변의 맥락 추출 (앞뒤 200자씩)
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

    // 정확한 위치에서 텍스트 교체
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

  // 리라이팅 모달 닫기



  const closeRewriteModal = () => {
    setShowRewriteModal(false);
    setSelectedText('');
    setSelectedTextStart(0);
    setSelectedTextEnd(0);
    setRewriteResult(null);
    setRewriteIntensity('');
    window.getSelection().removeAllRanges();
  };

  // 메모 관련 함수들
  const loadMemo = async () => {
    if (generatedScriptId) {
      try {
        const response = await api.get(`/ai-script/scripts/${generatedScriptId}/memo`);
        const memo = response.data.memo || '';
        setScriptMemo(memo);
      } catch (error) {
        console.error('메모 로딩 오류:', error);
        // API 오류 시 빈 메모로 시작
        setScriptMemo('');
      }
    }
  };

  const saveMemo = async () => {
    if (!generatedScriptId) {
      toast.error('스크립트 ID가 없습니다.');
      return;
    }

    setIsSavingMemo(true);
    try {
      const response = await api.put(`/ai-script/scripts/${generatedScriptId}/memo`, {
        memo: scriptMemo
      });
      
      if (response.data.success) {
        toast.success('메모가 저장되었습니다!');
        setShowMemoModal(false);
      } else {
        throw new Error(response.data.error || '메모 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('메모 저장 오류:', error);
      toast.error(error.response?.data?.error || '메모 저장 중 오류가 발생했습니다.');
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
  };

  // 대본 생성 핸들러
  const handleGenerate = async (e) => {
    e.preventDefault();
    
    // 로그인 확인
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    // 구독 상태 확인
    if (!usageData.isActive) {
      toast.error('활성화된 구독이 필요합니다.');
      return;
    }
    
    // 사용량 제한 확인
    if (!usageData.canGenerate) {
      const limitText = usageData.limit === null ? '무제한' : `${usageData.limit}회`;
      toast.error(`이번 달 사용량 한도(${limitText})를 모두 사용했습니다. ${usageData.daysUntilReset}일 후 리셋됩니다.`);
      return;
    }
    
    // 입력값 검증
    const isChildrenTemplate = selectedTemplate?.value === 'children';
    const isAnimalFriendsTheme = selectedChildrenTheme?.value === 'animal-friends';
    
    // 동물 친구들 테마의 경우 동물 선택 기반 검증
    if (isAnimalFriendsTheme && selectedAnimals.length > 0) {
      if (!formData.length) {
        setError('대본 길이를 선택해주세요.');
        return;
      }
      
      // 동물 캐릭터 설정이 완료되었는지 확인
      if (formData.characters.length === 0) {
        setError('동물 캐릭터 설정이 완료되지 않았습니다.');
        return;
      }
      
      const totalPercentage = formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0);
      if (totalPercentage !== 100) {
        setError('동물 캐릭터들의 대사 분량 합계가 100%가 되어야 합니다.');
        return;
      }
    } else if (parseInt(formData.characterCount) === 1) {
      const requiredFields = ['characterCount', 'length', 'gender', 'age'];
      if (!isChildrenTemplate) requiredFields.push('genre');
      
      if (requiredFields.some(field => !formData[field])) {
        const requiredFieldsText = isChildrenTemplate 
          ? '등장인물 수, 대본 길이, 성별, 연령대'
          : '등장인물 수, 장르, 대본 길이, 성별, 연령대';
        setError(`필수 항목을 모두 선택해주세요. (${requiredFieldsText})`);
        return;
      }
    } else {
      const requiredFields = ['characterCount', 'length'];
      if (!isChildrenTemplate) requiredFields.push('genre');
      
      if (requiredFields.some(field => !formData[field])) {
        const requiredFieldsText = isChildrenTemplate 
          ? '등장인물 수, 대본 길이'
          : '등장인물 수, 장르, 대본 길이';
        setError(`필수 항목을 모두 선택해주세요. (${requiredFieldsText})`);
        return;
      }
    }

    // 멀티 캐릭터 모드일 때 추가 검증
    if (parseInt(formData.characterCount) > 1) {
      const hasEmptyFields = formData.characters.some((char, index) => 
        !char.name.trim() || !char.gender || !char.age || !char.roleType || typeof char.percentage !== 'number' || 
        (index > 0 && (!char.relationshipWith || !char.relationshipType)) // 첫 번째 인물이 아닐 때만 관계 필수
      );
      if (hasEmptyFields) {
        setError('모든 인물의 설정을 완료해주세요. (이름, 성별, 연령대, 역할, 관계, 분량)');
        return;
      }
      
      // 총 퍼센트가 정확히 100인지 확인
      const totalPercentage = formData.characters.reduce((sum, char) => sum + char.percentage, 0);
      if (totalPercentage !== 100) {
        alert(`❌ 대사 분량 조정 필요\n\n현재 총 분량: ${totalPercentage}%\n필요한 분량: 100%\n\n각 인물의 분량을 조정하여 정확히 100%가 되도록 해주세요.`);
        setError(`대사 분량 합계가 ${totalPercentage}%입니다. 정확히 100%가 되도록 조정해주세요.`);
        return;
      }
    }

    setIsGenerating(true);
    setError('');
    setGeneratedScript('');
    setFinalPrompt('');

    try {
      const requestData = {
        characterCount: formData.characterCount,
        genre: formData.genre,
        length: formData.length,
        gender: parseInt(formData.characterCount) === 1 ? formData.gender : 'random',
        age: parseInt(formData.characterCount) === 1 ? formData.age : 'random',
        // 새로운 옵션들 추가
        customPrompt: formData.customPrompt || ''
      };

      // 멀티 캐릭터 모드일 때 characters 데이터 추가
      if (parseInt(formData.characterCount) > 1) {
        requestData.characters = formData.characters;
      }

      const response = await api.post('/ai-script/generate', requestData);

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || '대본 생성에 실패했습니다.');
      }

      setGeneratedScript(data.script.content || data.script);
      setGeneratedScriptId(data.script.id); // 백엔드에서 반환된 스크립트 ID 저장
      setFinalPrompt(data.finalPrompt || ''); // AI에게 전송된 최종 프롬프트 저장
      
      // 사용량 정보 업데이트
      await fetchUsageInfo();
      
      // 성공 메시지
      toast.success(`AI 스크립트가 생성되었습니다! 🎭`);
      
      // 결과 영역으로 스크롤
      setTimeout(() => {
        const resultElement = document.getElementById('result');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('대본 생성 오류:', error);
      
      let errorMessage = '대본 생성 중 오류가 발생했습니다.';
      
      if (error.response?.status === 503) {
        errorMessage = 'AI 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.';
      } else if (error.response?.status === 402) {
        errorMessage = 'API 할당량이 부족합니다. 잠시 후 다시 시도해주세요.';
      } else if (error.response?.status === 429) {
        errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // 드롭다운 컴포넌트
  const Dropdown = ({ options, value, onChange, placeholder, isOpen, setIsOpen }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors flex items-center justify-between hover:border-gray-300"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto"
          >
            {options.map((option) => {
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center justify-between hover:bg-gray-50"
                >
                  <span>{option}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );



  if (showChildrenThemeSelection) {
    return (
      <ChildrenThemeSelection
        childrenThemes={childrenThemes}
        onThemeSelect={handleChildrenThemeSelect}
        onBack={handleBackToTemplatesFromTheme}
      />
    );
  }

  if (showAnimalSelection) {
    return (
      <div>
        <AnimalSelection
          availableAnimals={availableAnimals}
          selectedAnimals={selectedAnimals}
          selectedScriptLength={selectedScriptLength}
          lengths={lengths}
          onAnimalToggle={handleAnimalToggle}
          onAnimalPercentageChange={handleAnimalPercentageChange}
          onAnimalRoleChange={handleAnimalRoleChange}
          onScriptLengthChange={setSelectedScriptLength}
          onComplete={handleAnimalSelectionComplete}
          onBack={() => setShowChildrenThemeSelection(true)}
          isLengthDropdownOpen={isLengthDropdownOpen}
          setIsLengthDropdownOpen={setIsLengthDropdownOpen}
        />
        {/* 어린이 연극 대본 결과 */}
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
                        {formData.length === 'short' ? '짧은 대본' : formData.length === 'medium' ? '중간 길이' : '긴 대본'}
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
                    className="cursor-text select-text"
                    onMouseUp={handleTextSelection}
                  >
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
                      // 동물 선택 화면 새로고침
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
    );

  // 기본 일반 대본 생성 화면 렌더링
  if (generatedScript) {
    return (
      <div>
        {/* 일반 대본 결과 화면 */}
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-8"
            >
              <div className="cursor-text select-text" onMouseUp={handleTextSelection}>
                <ScriptRenderer script={generatedScript} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // 기본 일반 대본 생성 화면  
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        
        {/* 사용량 표시 바 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  usageData.isPremium ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <span className="font-medium text-gray-900 text-sm">
                  {usageData.isPremium ? '무제한 플랜' : '베타 테스트'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {usageData.limit === null || usageData.limit === '무제한' ? 
                  `${usageData.used}회 사용` :
                  `${usageData.used}/${usageData.limit}회 사용`
                }
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!usageData.isPremium && usageData.limit && usageData.limit !== '무제한' && (
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (usageData.used / usageData.limit) * 100)}%` }}
                  ></div>
                </div>
              )}
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                usageData.isPremium 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {usageData.isPremium ? '무제한' : `월 ${usageData.limit}회`}
              </span>
            </div>
          </div>
        </div>

        {/* 사용량 초과 경고 */}
        {!usageData.canGenerate && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="text-orange-500 mt-1">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 mb-1">
                  사용량 한도 초과
                </h3>
                <p className="text-orange-700 text-sm mb-2">
                  베타 테스트 한도(월 {usageData.limit}회)를 초과했습니다. 다음 달에 사용량이 리셋됩니다.
                </p>
                <p className="text-xs text-orange-600">
                  더 많은 사용이 필요하시면 관리자에게 문의해주세요.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 페이지 헤더 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* 템플릿으로 돌아가기 버튼 */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleBackToTemplates}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors duration-200 text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>템플릿 선택으로</span>
            </button>
          </div>
          
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="text-4xl">
              {selectedTemplate?.icon || '🎭'}
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                {selectedTemplate?.label || 'AI 대본 생성기'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {selectedTemplate?.description || '맞춤형 대본을 생성합니다'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 메인 폼 카드 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 mb-8"
        >
            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* 선택된 템플릿 표시 */}
              {selectedTemplate && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{selectedTemplate.icon}</span>
                    <div>
                      <h3 className="font-semibold text-purple-900">선택된 템플릿: {selectedTemplate.label}</h3>
                      <p className="text-sm text-purple-700">{selectedTemplate.description}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 등장인물 수 */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">등장인물 수</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {characterOptions.map((option) => (
                    <label key={option.value} className="relative group">
                      <input
                        type="radio"
                        name="characterCount"
                        value={option.value}
                        onChange={(e) => handleInputChange('characterCount', e.target.value)}
                        className="sr-only peer"
                        disabled={!option.available}
                      />
                      <div className={`p-4 border rounded-2xl transition-all cursor-pointer ${
                        option.available 
                          ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-2 peer-checked:ring-blue-100'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                      }`}>
                        <div className="text-center space-y-2">
                          <div className={`text-xl ${!option.available ? 'grayscale' : ''}`}>{option.icon}</div>
                          <div className={`text-sm font-medium ${
                            option.available ? 'text-gray-900 group-hover:text-blue-600 peer-checked:text-blue-600' : 'text-gray-500'
                          }`}>
                            {option.label}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 인물 개별 설정 (2명 이상일 때만 표시) */}
              {parseInt(formData.characterCount) > 1 && (
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Edit3 className="w-6 h-6 mr-3 text-purple-500" />
                    인물 설정
                  </label>
                  {/* 총 분량 표시 */}
                  <div className={`border rounded-lg p-4 mb-4 transition-all duration-300 ${
                    formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}>
                        총 대사 분량 
                        {formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100 
                          ? ' ✅ 완료' 
                          : ' ⚠️ 조정 필요'
                        }
                      </span>
                      <span className={`text-lg font-bold ${
                        formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0)}% / 100%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100
                            ? 'bg-green-500'
                            : formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) > 100
                            ? 'bg-red-500'
                            : 'bg-orange-400'
                        }`}
                        style={{ 
                          width: `${Math.min(100, formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0))}%` 
                        }}
                      ></div>
                    </div>
                    {formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) !== 100 && (
                      <p className="text-xs text-red-600 mt-2">
                        {formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) > 100 
                          ? `${formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) - 100}% 초과됨` 
                          : `${100 - formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0)}% 부족함`
                        }
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {formData.characters.map((character, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <h4 className="font-medium text-gray-800 mb-3">인물 {index + 1}</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {/* 인물 이름 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                            <input
                              type="text"
                              value={character.name}
                              onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="인물 이름을 입력하세요"
                            />
                          </div>
                          
                          {/* 인물 성별, 연령대, 역할을 2x2 그리드로 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                              <select
                                value={character.gender}
                                onChange={(e) => handleCharacterChange(index, 'gender', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="">성별 선택</option>
                                <option value="male">남자</option>
                                <option value="female">여자</option>
                                <option value="random">랜덤</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">연령대</label>
                              <select
                                value={character.age}
                                onChange={(e) => handleCharacterChange(index, 'age', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="">연령대 선택</option>
                                {ages.map((age) => (
                                  <option key={age.value} value={age.value}>{age.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">역할</label>
                              <select
                                value={character.roleType || '조연'}
                                onChange={(e) => handleCharacterChange(index, 'roleType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                {roleTypes.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.icon} {role.label} - {role.description}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            {index > 0 && ( // 첫 번째 인물이 아닐 때만 관계 선택 표시
                              <div className="col-span-2 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      관계 상대
                                    </label>
                                    <select
                                      value={character.relationshipWith || '인물 1'}
                                      onChange={(e) => handleCharacterChange(index, 'relationshipWith', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      {formData.characters.slice(0, index).map((otherChar, otherIndex) => (
                                        <option key={otherIndex} value={otherChar.name}>
                                          {otherChar.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      관계 유형
                                    </label>
                                    <select
                                      value={character.relationshipType || '친구'}
                                      onChange={(e) => handleCharacterChange(index, 'relationshipType', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      {relationshipTypes.map((rel) => (
                                        <option key={rel.value} value={rel.value}>
                                          {rel.icon} {rel.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {character.relationshipWith}와(과) {character.relationshipType || '친구'} 관계
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 인물 분량 (퍼센트 슬라이더) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              대사 분량 (전체 대사 중 비중): {character.percentage || 0}%
                            </label>
                            <div className="relative">
                              <input
                                type="range"
                                min="5"
                                max="90"
                                step="5"
                                value={character.percentage || 0}
                                onChange={(e) => handleCharacterChange(index, 'percentage', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, 
                                    #8b5cf6 0%, 
                                    #8b5cf6 ${character.percentage || 0}%, 
                                    #e5e7eb ${character.percentage || 0}%, 
                                    #e5e7eb 100%)`
                                }}
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>5%</span>
                                <span className="text-purple-600 font-medium">{character.percentage || 0}%</span>
                                <span>90%</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              5% 단위로 조절 가능 (대사 줄 수 기준)
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 장르 선택 (어린이 템플릿이 아닐 때만 표시) */}
              {selectedTemplate?.value !== 'children' && (
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Film className="w-6 h-6 mr-3 text-purple-500" />
                    장르
                  </label>
                  <Dropdown
                    options={genres}
                    value={formData.genre}
                    onChange={(value) => handleInputChange('genre', value)}
                    placeholder="장르를 선택하세요"
                    isOpen={showGenreDropdown}
                    setIsOpen={setShowGenreDropdown}
                  />
                </div>
              )}

              {/* 대본 길이 */}
              <div className="space-y-4">
                <label className="flex items-center text-lg font-semibold text-gray-800">
                  <Clock className="w-6 h-6 mr-3 text-purple-500" />
                  대본 길이
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lengths.map((length) => (
                    <label key={length.value} className="relative">
                      <input
                        type="radio"
                        name="length"
                        value={length.value}
                        onChange={(e) => handleInputChange('length', e.target.value)}
                        className="sr-only peer"

                      />
                      <div className="p-4 border-2 rounded-xl cursor-pointer transition-all relative bg-gray-50 border-gray-200 hover:bg-gray-100 peer-checked:bg-gradient-to-r peer-checked:from-purple-50 peer-checked:to-pink-50 peer-checked:border-purple-500 peer-checked:shadow-md">
                        <div className="text-center">
                          <div className="text-2xl mb-2">{length.icon}</div>
                          <div className="font-medium text-gray-900">{length.label}</div>
                          <div className="text-sm text-gray-500">{length.time}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 성별 선택 (1인 독백일 때만) */}
              {parseInt(formData.characterCount) === 1 && (
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Users className="w-6 h-6 mr-3 text-purple-500" />
                    성별
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {genders.map((gender) => (
                      <label key={gender.value} className="relative">
                        <input
                          type="radio"
                          name="gender"
                          value={gender.value}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="sr-only peer"
                        />
                        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-gradient-to-r peer-checked:from-blue-50 peer-checked:to-indigo-50 peer-checked:border-blue-500 peer-checked:shadow-md">
                          <div className="text-center">
                            <div className="text-2xl mb-2">{gender.icon}</div>
                            <div className="font-medium text-gray-900">{gender.label}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 연령대 선택 (1인 독백일 때만) */}
              {parseInt(formData.characterCount) === 1 && (
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Clock className="w-6 h-6 mr-3 text-indigo-500" />
                    연령대
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ages.map((age) => (
                      <label key={age.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="age"
                          value={age.value}
                          onChange={(e) => handleInputChange('age', e.target.value)}
                          className="sr-only peer"
                        />
                        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-gradient-to-r peer-checked:from-indigo-50 peer-checked:to-purple-50 peer-checked:border-indigo-500 peer-checked:shadow-md">
                          <div className="text-center">
                            <div className="text-2xl mb-2">{age.icon}</div>
                            <div className="font-medium text-gray-900 mb-1">{age.label}</div>
                            <div className="text-xs text-gray-600">{age.description}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}





              {/* 커스텀 프롬프트 입력 */}
              <div className="space-y-4">
                <label className="flex items-center text-lg font-semibold text-gray-800">
                  <svg className="w-6 h-6 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  직접 프롬프트 작성 (고급 옵션)
                </label>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <svg className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">💡 고급 사용자를 위한 옵션</p>
                      <p>위의 옵션들 대신 AI에게 직접 지시사항을 작성할 수 있습니다. 이 필드를 작성하면 위의 다른 설정들을 덮어씁니다.</p>
                      {parseInt(formData.characterCount) > 1 && (
                        <p className="mt-2 text-amber-700">
                          <span className="font-medium">✨ 인물 태그 기능:</span> /{' '}뒤에 인물 이름을 입력하거나 오른쪽 패널에서 인물을 클릭해보세요!
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* 인물 선택 사이드바 */}
                    {parseInt(formData.characterCount) > 1 && (
                      <div className="absolute right-0 top-0 bottom-0 w-32 bg-white border-l border-amber-200 rounded-r-lg overflow-hidden">
                        <div className="bg-amber-100 px-2 py-2 text-xs font-medium text-amber-800 text-center">
                          인물 선택
                        </div>
                        <div className="p-1 space-y-1 max-h-28 overflow-y-auto">
                          {formData.characters.map((char, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => insertCharacterTag(char.name)}
                              className="w-full text-left px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 hover:border-amber-300 transition-colors"
                              title={`/${char.name} 태그 삽입`}
                            >
                              <div className="font-medium text-amber-900 truncate">{char.name}</div>
                              <div className="text-amber-700 text-xs">{char.roleType}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={`relative ${parseInt(formData.characterCount) > 1 ? 'pr-32' : ''}`}>
                      <div className="relative">
                        <textarea
                          ref={(el) => setTextareaRef(el)}
                          value={formData.customPrompt}
                          onChange={handleCustomPromptChange}
                          onKeyDown={(e) => {
                            // 자동완성 패널에서 엔터키로 선택
                            if (showCharacterPanel && e.key === 'Enter') {
                              e.preventDefault();
                              const currentValue = formData.customPrompt;
                              const currentCursor = e.target.selectionStart;
                              const beforeCursor = currentValue.slice(0, currentCursor);
                              const lastSlash = beforeCursor.lastIndexOf('/');
                              
                              if (lastSlash !== -1) {
                                const searchTerm = beforeCursor.slice(lastSlash + 1).toLowerCase();
                                const availableCharacters = formData.characters.filter(char => 
                                  char.name.toLowerCase().includes(searchTerm)
                                );
                                if (availableCharacters.length > 0) {
                                  selectCharacterFromAutocomplete(availableCharacters[0].name);
                                }
                              }
                            }
                          }}
                          placeholder="AI에게 원하는 대본의 구체적인 지시사항을 작성하세요. 예) '병원에서 의사와 환자가 나누는 마지막 대화. 환자는 시한부 선고를 받았고, 의사는 희망을 잃지 말라고 격려한다. 감동적이면서도 현실적인 대화로 구성해줘.'"
                          className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-transparent relative z-10"
                          rows="4"
                          style={{ color: 'transparent', caretColor: 'black' }}
                        />
                        
                        {/* 하이라이트된 텍스트 오버레이 */}
                        <div 
                          className="absolute inset-0 px-4 py-3 pointer-events-none whitespace-pre-wrap break-words text-gray-900 z-0"
                          style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.5', 
                            fontFamily: 'inherit',
                            border: '1px solid transparent',
                            borderRadius: '12px'
                          }}
                        >
                          {(() => {
                            let highlightedText = formData.customPrompt;
                            
                            // 각 인물 이름을 하이라이트로 감싸기
                            formData.characters.forEach(char => {
                              const charName = char.name;
                              // 정확한 단어 매칭을 위한 정규식 (앞뒤로 공백이나 문장부호가 있는 경우)
                              const regex = new RegExp(`(^|\\s|[^\\w가-힣])${charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|[^\\w가-힣]|$)`, 'g');
                              highlightedText = highlightedText.replace(regex, (match, before) => {
                                return `${before}<HIGHLIGHT_START>${charName}<HIGHLIGHT_END>`;
                              });
                            });
                            
                            // 하이라이트 마커를 실제 JSX로 변환
                            return highlightedText.split(/(<HIGHLIGHT_START>.*?<HIGHLIGHT_END>)/).map((part, index) => {
                              if (part.startsWith('<HIGHLIGHT_START>') && part.endsWith('<HIGHLIGHT_END>')) {
                                const content = part.replace('<HIGHLIGHT_START>', '').replace('<HIGHLIGHT_END>', '');
                                return (
                                  <span 
                                    key={index}
                                    className="bg-green-200 text-green-800 px-1 rounded font-medium"
                                  >
                                    {content}
                                  </span>
                                );
                              }
                              return <span key={index}>{part}</span>;
                            });
                          })()}
                        </div>
                      </div>
                      
                      {/* 태그 하이라이트 표시 (textarea 아래) */}
                      {parseInt(formData.characterCount) > 1 && formData.customPrompt && (
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="text-xs font-medium text-gray-600 mb-2">인물 태그:</div>
                          <div className="text-sm flex flex-wrap gap-1">
                            {/* 완성된 태그 표시 (/ 없는 인물명) */}
                            {formData.characters.map((char, index) => {
                              const charName = char.name;
                              const hasCompletedTag = formData.customPrompt.includes(charName) && 
                                                    !formData.customPrompt.includes(`/${charName}`);
                              
                              if (hasCompletedTag) {
                                return (
                                  <span
                                    key={`completed-${index}`}
                                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-xs font-medium"
                                  >
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                    {charName}
                                  </span>
                                );
                              }
                              return null;
                            })}
                            
                            {/* 미완성 태그 표시 (/ 있는 태그) */}
                            {formData.customPrompt.split(/(\/.+?(?=\s|$|\/))/).map((part, index) => {
                              if (part.startsWith('/')) {
                                const tagName = part.substring(1).trim();
                                const isValidTag = formData.characters.some(char => char.name === tagName);
                                return (
                                  <span
                                    key={`incomplete-${index}`}
                                    className={`inline-block px-2 py-1 rounded cursor-pointer transition-colors ${
                                      isValidTag 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200' 
                                        : 'bg-red-100 text-red-800 border border-red-300'
                                    }`}
                                    onClick={isValidTag ? () => selectTaggedCharacter(part, index) : undefined}
                                    title={isValidTag ? `클릭하여 "${tagName}" 태그 완료` : `알 수 없는 인물: ${tagName}`}
                                  >
                                    {part} {isValidTag && '→'}
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* 자동완성 패널 */}
                      {showCharacterPanel && parseInt(formData.characterCount) > 1 && (
                        <div className="absolute z-10 bg-white border border-amber-300 rounded-lg shadow-lg max-h-32 overflow-y-auto" 
                             style={{
                               left: '16px',
                               top: `${Math.min(120, (formData.customPrompt.slice(0, cursorPosition).split('\n').length - 1) * 20 + 40)}px`
                             }}>
                          {formData.characters
                            .filter(char => {
                              const searchTerm = formData.customPrompt.slice(
                                formData.customPrompt.lastIndexOf('/', cursorPosition) + 1, 
                                cursorPosition
                              ).toLowerCase();
                              return char.name.toLowerCase().includes(searchTerm);
                            })
                            .map((char, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => selectCharacterFromAutocomplete(char.name)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-amber-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-amber-900">{char.name}</div>
                                <div className="text-xs text-amber-700">{char.roleType}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-amber-600 mt-2">
                    이 필드를 작성하면 위의 모든 설정 옵션들이 무시되고 이 프롬프트가 우선 적용됩니다.
                    {parseInt(formData.characterCount) > 1 && (
                      <div className="mt-1">
                        <span className="font-medium">인물 태그 사용법:</span> /{' '}뒤에 인물 이름을 입력하면 자동완성이 나타납니다.
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* 생성 버튼 */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isGenerating || !usageData.canGenerate}
                  className={`w-full py-4 px-8 text-xl font-semibold rounded-xl transition-all duration-300 ${
                    isGenerating || !usageData.canGenerate
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:scale-[1.02]'
                  } text-white shadow-md`}
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center space-x-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>AI가 대본을 생성하고 있습니다...</span>
                    </div>
                  ) : !usageData.canGenerate ? (
                    <div className="flex items-center justify-center space-x-3">
                      <AlertCircle className="w-6 h-6" />
                      <span>사용량 초과 ({usageData.daysUntilReset}일 후 리셋)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <Wand2 className="w-6 h-6" />
                      <span>🎭 대본 생성하기</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

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

          {/* 생성된 대본 결과 */}
          <AnimatePresence>
            {generatedScript && (
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">AI 대본 생성 완료!</h2>
                  <p className="text-gray-600">생성된 대본을 확인하고 연습에 활용해보세요.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg font-semibold text-gray-800">생성된 대본</h3>
                    <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                      <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                        {formData.characterCount}명
                      </span>
                      <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                        {formData.genre}
                      </span>
                      <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-700 rounded-full">
                        {formData.gender === 'male' ? '남자' : formData.gender === 'female' ? '여자' : '랜덤'}
                      </span>
                      <span className="px-2 py-1 sm:px-3 bg-orange-100 text-orange-700 rounded-full">
                        {ages.find(age => age.value === formData.age)?.label || formData.age}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start sm:items-center text-blue-700">
                      <RefreshCw className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다 (최소 5자 이상)</span>
                    </div>
                  </div>
                  
                  <div onMouseUp={handleTextSelection}>
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
          </AnimatePresence>

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
                          { 
                            value: 'light', 
                            title: '🔧 가볍게 수정', 
                            desc: '자연스러운 표현으로 약간만 다듬기' 
                          },
                          { 
                            value: 'emotional', 
                            title: '❤️ 감정 강조', 
                            desc: '감정 표현을 더욱 강화하고 깊이있게' 
                          },
                          { 
                            value: 'full', 
                            title: '🚀 전면 변경', 
                            desc: '완전히 새로운 방식으로 다시 작성' 
                          }
                        ].map((option) => (
                          <label key={option.value} className="relative">
                            <input
                              type="radio"
                              name="rewriteIntensity"
                              value={option.value}
                              checked={rewriteIntensity === option.value}
                              onChange={(e) => setRewriteIntensity(e.target.value)}
                              className="sr-only peer"
                            />
                            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-purple-50 peer-checked:border-purple-500 peer-checked:shadow-md">
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 mb-1">{option.title}</div>
                                  <div className="text-sm text-gray-600">{option.desc}</div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 리라이팅 버튼 */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleRewrite}
                        disabled={!rewriteIntensity || isRewriting}
                        className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                          !rewriteIntensity || isRewriting
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isRewriting ? (
                          <div className="flex items-center justify-center space-x-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span>리라이팅 중...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Wand2 className="w-5 h-5" />
                            <span>리라이팅 실행</span>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* 리라이팅 결과 */}
                    {rewriteResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 border-t border-gray-200 pt-6"
                      >
                        <div className="flex items-center text-lg font-semibold text-gray-800">
                          <ArrowRight className="w-5 h-5 mr-2 text-green-500" />
                          리라이팅 결과
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="text-gray-800 font-mono text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                            "{rewriteResult.rewritten}"
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={applyRewrite}
                            className="flex-1 flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-md"
                          >
                            <Check className="w-5 h-5 mr-2" />
                            적용하기
                          </button>
                          <button
                            onClick={() => setRewriteResult(null)}
                            className="flex items-center justify-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                          >
                            <RotateCcw className="w-5 h-5 mr-2" />
                            재시도
                          </button>
                        </div>
                      </motion.div>
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
                          <p className="text-gray-600">연습에 도움이 될 메모를 작성하세요</p>
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
                    {/* 메모 입력 */}
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-gray-800">메모 내용</label>
                      <textarea
                        value={scriptMemo}
                        onChange={(e) => setScriptMemo(e.target.value)}
                        placeholder="대본에 대한 메모를 작성하세요...&#10;- 연기 팁&#10;- 감정 포인트&#10;- 무대 설정&#10;- 기타 연출 노트"
                        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm leading-relaxed"
                      />
                      <div className="text-right text-xs text-gray-500">
                        {scriptMemo.length} / 1000자
                      </div>
                    </div>

                    {/* 저장 버튼 */}
                    <div className="flex gap-3">
                      <button
                        onClick={saveMemo}
                        disabled={isSavingMemo || scriptMemo.length > 1000}
                        className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                          isSavingMemo || scriptMemo.length > 1000
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isSavingMemo ? (
                          <div className="flex items-center justify-center space-x-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span>저장 중...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Save className="w-5 h-5" />
                            <span>메모 저장</span>
                          </div>
                        )}
                      </button>
                      <button
                        onClick={closeMemoModal}
                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                      >
                        취소
                      </button>
                    </div>

                    {/* 메모 사용 안내 */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start text-amber-700">
                        <FileText className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">💡 메모 활용 팁</p>
                          <ul className="text-xs space-y-1">
                            <li>• 대본의 감정 포인트나 연기 방향을 기록하세요</li>
                            <li>• 연습하면서 발견한 중요한 부분을 메모하세요</li>
                            <li>• 메모는 브라우저에 저장되어 다음에도 확인할 수 있습니다</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // 기본 일반 대본 생성 화면
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        
        {/* 사용량 표시 바 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  usageData.isPremium ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <span className="font-medium text-gray-900 text-sm">
                  {usageData.isPremium ? '무제한 플랜' : '베타 테스트'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {usageData.limit === null || usageData.limit === '무제한' ? 
                  `${usageData.used}회 사용` :
                  `${usageData.used}/${usageData.limit}회 사용`
                }
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!usageData.isPremium && usageData.limit && usageData.limit !== '무제한' && (
                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (usageData.used / usageData.limit) * 100)}%` }}
                  ></div>
                </div>
              )}
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                usageData.isPremium 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {usageData.isPremium ? '무제한' : `월 ${usageData.limit}회`}
              </span>
            </div>
          </div>
        </div>

        {/* 사용량 초과 경고 */}
        {!usageData.canGenerate && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="text-orange-500 mt-1">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 mb-1">
                  사용량 한도 초과
                </h3>
                <p className="text-orange-700 text-sm mb-2">
                  베타 테스트 한도(월 {usageData.limit}회)를 초과했습니다. 다음 달에 사용량이 리셋됩니다.
                </p>
                <p className="text-xs text-orange-600">
                  더 많은 사용이 필요하시면 관리자에게 문의해주세요.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 페이지 헤더 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* 템플릿으로 돌아가기 버튼 */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleBackToTemplates}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors duration-200 text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>템플릿 선택으로</span>
            </button>
          </div>
          
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="text-4xl">
              {selectedTemplate?.icon || '🎭'}
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                {selectedTemplate?.label || 'AI 대본 생성기'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {selectedTemplate?.description || '맞춤형 대본을 생성합니다'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 메인 폼 카드 및 기타 컨텐츠는 여기에... */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 mb-8">
          <div className="text-center text-gray-500">
            일반 대본 생성 폼이 여기에 위치합니다.
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default AIScript; 