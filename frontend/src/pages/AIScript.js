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
  FileText,
  ArrowLeft
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

  // 템플릿 선택 상태
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentStep, setCurrentStep] = useState('template'); // 'template' | 'configure' | 'result'

  // 폼 상태 관리 (GeneralScript에서 가져옴)
  const [formData, setFormData] = useState({
    template: 'general',
    characterCount: '1',
    genre: '',
    length: '',
    gender: '',
    age: '',
    characters: [],
    characterRelationships: '',
    customPrompt: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState('');
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

  // 템플릿 데이터
  const templates = [
    {
      value: 'children',
      label: '어린이 연극',
      description: '5~12세 어린이를 위한 교육적이고 재미있는 연극',
      icon: '🧒',
      color: 'from-green-400 to-blue-500',
      path: '/ai-script/children'
    },
    {
      value: 'school',
      label: '학교 연극',
      description: '학교 발표회나 축제에 적합한 연극',
      icon: '🎒',
      color: 'from-blue-400 to-purple-500',
      path: '/ai-script/school'
    },
    {
      value: 'family',
      label: '가족 연극',
      description: '온 가족이 함께 즐길 수 있는 연극',
      icon: '👨‍👩‍👧‍👦',
      color: 'from-purple-400 to-pink-500',
      path: '/ai-script/family'
    },
    {
      value: 'general',
      label: '일반 대본',
      description: '자유로운 설정으로 다양한 상황의 대본',
      icon: '🎭',
      color: 'from-pink-400 to-orange-500',
      path: '/ai-script/general'
    }
  ];

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      setLoadingUsage(true);
      const response = await api.get('/admin/usage');
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

  // URL 파라미터에 따른 템플릿 자동 선택
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/children')) {
      const childrenTemplate = templates.find(t => t.value === 'children');
      setSelectedTemplate(childrenTemplate);
      setFormData(prev => ({ ...prev, template: 'children' }));
      setCurrentStep('configure');
    } else if (path.includes('/school')) {
      const schoolTemplate = templates.find(t => t.value === 'school');
      setSelectedTemplate(schoolTemplate);
      setFormData(prev => ({ ...prev, template: 'school' }));
      setCurrentStep('configure');
    } else if (path.includes('/family')) {
      const familyTemplate = templates.find(t => t.value === 'family');
      setSelectedTemplate(familyTemplate);
      setFormData(prev => ({ ...prev, template: 'family' }));
      setCurrentStep('configure');
    } else if (path.includes('/general')) {
      const generalTemplate = templates.find(t => t.value === 'general');
      setSelectedTemplate(generalTemplate);
      setFormData(prev => ({ ...prev, template: 'general' }));
      setCurrentStep('configure');
    }
  }, [location.pathname]);

  // 옵션 데이터
  const characterOptions = [
    { value: '1', label: '1인 독백', icon: '👤', available: true },
    { value: '2', label: '2인 대화', icon: '👥', available: true, premium: false },
    { value: '3', label: '3인 대화', icon: '👥', available: true, premium: false },
    { value: '4', label: '4인 앙상블', icon: '👨‍👩‍👧‍👦', available: true, premium: false }
  ];

  const freeGenres = ['로맨스','비극', '코미디', '드라마'];
  const premiumGenres = ['스릴러', '액션', '공포', '판타지', 'SF', '미스터리', '시대극'];
  const genres = [...freeGenres, ...premiumGenres];

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

  // TODO(human) - 템플릿 선택 로직 구현
  // 현재 AIScriptMain.js의 템플릿 선택 기능과 GeneralScript.js의 상세 설정 기능을 통합
  // selectedTemplate 상태를 활용하여 조건부 렌더링 구현

  // 템플릿 선택 처리
  const handleTemplateSelect = (templateValue) => {
    const template = templates.find(t => t.value === templateValue);
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template: templateValue }));
    setCurrentStep('configure');
  };

  // 뒤로가기
  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setCurrentStep('template');
    setFormData({
      template: 'general',
      characterCount: '1',
      genre: '',
      length: '',
      gender: '',
      age: '',
      characters: [],
      characterRelationships: '',
      customPrompt: ''
    });
    navigate('/ai-script');
  };

  // 입력 변경 처리
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'characterCount') {
      const count = parseInt(value);
      const characters = [];

      for (let i = 0; i < count; i++) {
        const equalPercentage = Math.floor(100 / count);
        const remainder = 100 - (equalPercentage * count);

        characters.push({
          name: `인물 ${i + 1}`,
          gender: '',
          age: '',
          roleType: i === 0 ? '주연' : '조연',
          percentage: i === 0 && remainder > 0 ? equalPercentage + remainder : equalPercentage,
          relationshipWith: i > 0 ? '인물 1' : '',
          relationshipType: i > 0 ? '친구' : ''
        });
      }

      setFormData(prev => ({ ...prev, characters }));
    }
  };

  // 캐릭터 변경 처리
  const handleCharacterChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, [field]: value } : char
      )
    }));
  };

  // 대본 생성 처리
  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!usageData.canGenerate) {
      toast.error('사용량 한도를 초과했습니다.');
      return;
    }

    // 커스텀 프롬프트가 있으면 그것을 사용, 없으면 기본 설정 검증
    if (!formData.customPrompt.trim()) {
      if (!formData.characterCount) {
        toast.error('등장인물 수를 선택해주세요.');
        return;
      }

      if (!formData.genre) {
        toast.error('장르를 선택해주세요.');
        return;
      }

      if (!formData.length) {
        toast.error('대본 길이를 선택해주세요.');
        return;
      }

      if (parseInt(formData.characterCount) > 1) {
        const totalPercentage = formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0);

        if (totalPercentage !== 100) {
          toast.error('인물들의 총 대사 분량이 100%가 되어야 합니다.');
          return;
        }

        const hasEmptyFields = formData.characters.some((char, index) =>
          !char.name.trim() || !char.gender || !char.age || !char.roleType
        );

        if (hasEmptyFields) {
          toast.error('모든 인물의 정보를 완전히 입력해주세요.');
          return;
        }
      } else {
        if (!formData.gender) {
          toast.error('성별을 선택해주세요.');
          return;
        }

        if (!formData.age) {
          toast.error('연령대를 선택해주세요.');
          return;
        }
      }
    }

    setIsGenerating(true);
    setError('');
    setGeneratedScript('');
    setFinalPrompt('');

    try {
      const requestData = { ...formData };

      // 템플릿에 따라 다른 엔드포인트 호출
      let endpoint = '/general-script/generate';
      if (selectedTemplate?.value === 'children') {
        endpoint = '/children-theater/generate';
      }

      const response = await api.post(endpoint, requestData);

      if (response.data.success) {
        setGeneratedScript(response.data.script.content);
        setGeneratedScriptId(response.data.script.id);
        setFinalPrompt(response.data.finalPrompt || '');
        setCurrentStep('result');

        await fetchUsageInfo();

        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        toast.success('대본이 성공적으로 생성되었습니다!');
      } else {
        throw new Error(response.data.error || '대본 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('대본 생성 오류:', error);
      setError(error.response?.data?.error || error.message || '대본 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 드롭다운 컴포넌트
  const DropdownComponent = ({ options, value, onChange, placeholder, isOpen, setIsOpen }) => (
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
            {options.map((option) => (
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
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // 어린이 연극 템플릿인 경우 특별 처리
  if (selectedTemplate?.value === 'children') {
    return <AnimalSelection />;
  }

  // 결과 화면 렌더링
  if (currentStep === 'result' && generatedScript) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-7xl mx-auto">
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
                <h2 className="text-3xl font-bold text-gray-900 mb-2">AI 대본 생성 완료!</h2>
                <p className="text-gray-600">생성된 대본을 확인하고 연습에 활용해보세요.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-800">생성된 대본</h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                      {selectedTemplate?.label}
                    </span>
                    {formData.genre && (
                      <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                        {formData.genre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="script-content">
                  <ScriptRenderer script={generatedScript} />
                </div>
              </div>

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
                  대본함
                </button>
                <button
                  onClick={handleBackToTemplates}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  템플릿 선택
                </button>
                <button
                  onClick={() => {
                    setGeneratedScript('');
                    setFinalPrompt('');
                    setError('');
                    setCurrentStep('configure');
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

  // 템플릿 선택 화면
  if (currentStep === 'template') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 py-4 sm:py-8 md:py-12">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-4xl mx-auto">

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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg"
                >
                  <Wand2 className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  AI 대본 생성기
                </h1>
                <p className="text-gray-600 text-lg">
                  상황에 맞는 템플릿을 선택하여 맞춤형 대본을 생성하세요
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <motion.div
                    key={template.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden"
                  >
                    <button
                      onClick={() => handleTemplateSelect(template.value)}
                      className="w-full p-6 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 group text-left"
                    >
                      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${template.color} rounded-xl mb-4 text-2xl`}>
                        {template.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                        {template.label}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {template.description}
                      </p>
                      <div className="flex items-center text-purple-600 font-medium">
                        <span>시작하기</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // 설정 화면 (일반 대본용)
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* 뒤로가기 버튼 */}
        <button
          onClick={handleBackToTemplates}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          템플릿 선택으로 돌아가기
        </button>

        {/* 선택된 템플릿 표시 */}
        {selectedTemplate && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-8">
            <div className="flex items-center">
              <div className={`w-12 h-12 bg-gradient-to-r ${selectedTemplate.color} rounded-xl flex items-center justify-center text-2xl mr-4`}>
                {selectedTemplate.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedTemplate.label}</h2>
                <p className="text-gray-600">{selectedTemplate.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* 메인 폼 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 mb-8"
        >
          <form onSubmit={handleGenerate} className="space-y-8">

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
                      checked={formData.characterCount === option.value}
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

            {/* 장르 선택 */}
            <div className="space-y-4">
              <label className="flex items-center text-lg font-semibold text-gray-800">
                <Film className="w-6 h-6 mr-3 text-purple-500" />
                장르
              </label>
              <DropdownComponent
                options={genres}
                value={formData.genre}
                onChange={(value) => handleInputChange('genre', value)}
                placeholder="장르를 선택하세요"
                isOpen={showGenreDropdown}
                setIsOpen={setShowGenreDropdown}
              />
            </div>

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
                      checked={formData.length === length.value}
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
                        checked={formData.gender === gender.value}
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
                        checked={formData.age === age.value}
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

      </div>
    </div>
  );
};

export default AIScript;