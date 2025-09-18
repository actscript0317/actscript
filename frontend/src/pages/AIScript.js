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
    template: 'school',
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

  // 사용량 정보 가져오기
  const fetchUsageInfo = async () => {
    try {
      setLoadingUsage(true);
      const response = await api.get('/admin/usage');
      const { usage } = response.data;

      setUsageData({
        used: usage.currentMonth,
        limit: usage.limit,
        isPremium: true, // 현재 모든 사용자 무료 프리미엄
        isActive: true,
        canGenerate: usage.canGenerate,
        planType: 'test',
        nextResetDate: usage.nextResetDate,
        daysUntilReset: usage.daysUntilReset
      });
    } catch (error) {
      console.error('사용량 정보 로딩 실패:', error);
      // 기본값으로 설정
      setUsageData(prev => ({
        ...prev,
        used: user?.usage?.currentMonth || 0,
        limit: user?.usage?.monthly_limit || 10,
        isPremium: true, // 현재 모든 사용자 무료 프리미엄
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

  // URL 파라미터에서 템플릿 정보 확인
  useEffect(() => {
    const path = location.pathname;

    if (path.includes('/school')) {
      setFormData(prev => ({ ...prev, template: 'school' }));
    } else if (path.includes('/family')) {
      setFormData(prev => ({ ...prev, template: 'family' }));
    } else if (path.includes('/children')) {
      setFormData(prev => ({ ...prev, template: 'children' }));
    } else {
      setFormData(prev => ({ ...prev, template: 'school' }));
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

  // 퍼센트 자동 조정
  const handlePercentageChange = (index, value) => {
    const newValue = Math.max(0, Math.min(100, parseInt(value) || 0));

    setFormData(prev => {
      const newCharacters = [...prev.characters];
      const oldValue = newCharacters[index].percentage;
      newCharacters[index].percentage = newValue;

      const difference = newValue - oldValue;
      const otherIndices = newCharacters
        .map((_, i) => i)
        .filter(i => i !== index && newCharacters[i].percentage > 0);

      if (otherIndices.length > 0 && difference !== 0) {
        const adjustmentPerOther = Math.floor(difference / otherIndices.length);
        let remainder = difference - (adjustmentPerOther * otherIndices.length);

        otherIndices.forEach((i, idx) => {
          const adjustment = adjustmentPerOther + (idx < remainder ? 1 : 0);
          newCharacters[i].percentage = Math.max(0, newCharacters[i].percentage - adjustment);
        });
      }

      const total = newCharacters.reduce((sum, char) => sum + char.percentage, 0);
      if (total !== 100 && newCharacters.length > 1) {
        const firstIndex = newCharacters.findIndex((_, i) => i !== index);
        if (firstIndex !== -1) {
          newCharacters[firstIndex].percentage += (100 - total);
          newCharacters[firstIndex].percentage = Math.max(0, newCharacters[firstIndex].percentage);
        }
      }

      return { ...prev, characters: newCharacters };
    });
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

      const response = await api.post('/general-script/generate', requestData);

      if (response.data.success) {
        setGeneratedScript(response.data.script.content);
        setGeneratedScriptId(response.data.script.id);
        setFinalPrompt(response.data.finalPrompt || '');

        // 사용량 정보 다시 로딩
        await fetchUsageInfo();

        // 스크롤을 맨 위로
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

  // 어린이 연극 템플릿인 경우 AnimalSelection 컴포넌트로 이동
  if (formData.template === 'children') {
    return <AnimalSelection />;
  }

  // 결과 화면 렌더링
  if (generatedScript) {
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
                      {formData.template === 'school' ? '학교 연극' : '가족 연극'}
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

              {/* 최종 프롬프트 표시 섹션 */}
              {finalPrompt && (
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200 mb-4 sm:mb-6">
                  <div className="flex items-center mb-3">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-blue-800">최종 프롬프트</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {finalPrompt}
                    </pre>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(finalPrompt);
                        toast.success('최종 프롬프트가 클립보드에 복사되었습니다!');
                      }}
                      className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      프롬프트 복사
                    </button>
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
                  대본함
                </button>
                <button
                  onClick={() => navigate('/ai-script')}
                  className="flex items-center justify-center px-3 sm:px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-md text-sm sm:text-base"
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  다른 템플릿
                </button>
                <button
                  onClick={() => {
                    setGeneratedScript('');
                    setFinalPrompt('');
                    setError('');
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

  // 기존 학교/가족 연극 설정 폼은 GeneralScript.js로 이동하도록 유도
  // 이 페이지는 실제로는 사용되지 않음 (라우팅에서 AIScriptMain을 사용)
  return null;
};

export default AIScript;