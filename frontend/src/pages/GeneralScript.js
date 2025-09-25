import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import ScriptRenderer from '../components/common/ScriptRenderer';
import Dropdown from '../components/common/Dropdown';

const GeneralScript = () => {
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

  // URL 파라미터에서 데이터 로딩
  useEffect(() => {
    const template = searchParams.get('template') || 'general';
    const genre = searchParams.get('genre') || '';
    const characterCount = searchParams.get('characterCount') || '1';

    setFormData(prev => ({
      ...prev,
      template,
      genre,
      characterCount
    }));
  }, [searchParams]);

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

  // 드롭다운 컴포넌트
  const DropdownComponent = ({ options, value, onChange, placeholder, isOpen, setIsOpen }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors flex items-center justify-between hover:border-gray-300 text-sm"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between hover:bg-gray-50 text-sm"
              >
                <span>{option}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // 메인 화면 - 분할 레이아웃
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate('/ai-script')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          템플릿 선택으로 돌아가기
        </button>

        {/* 분할 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* 왼쪽 옵션 패널 (1/3) */}
          <div className="lg:col-span-1">

            {/* 사용량 표시 바 */}
            <div className={`bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 ${
              usageData.isPremium ? 'border-green-500' : 'border-blue-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className={`w-4 h-4 ${
                      usageData.isPremium ? 'text-green-600' : 'text-blue-600'
                    }`} />
                    <span className="font-medium text-gray-900 text-sm">
                      {usageData.isPremium ? '무제한 플랜' : '베타 테스트 플랜'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {usageData.limit === null || usageData.limit === '무제한' ?
                      `${usageData.used}회 사용 (무제한)` :
                      `${usageData.used}/${usageData.limit}회 사용`
                    }
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!usageData.isPremium && usageData.limit && usageData.limit !== '무제한' && (
                    <div className="w-16 bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
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

            {/* 헤더 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mb-3 shadow-lg">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">일반 대본 생성</h1>
              <p className="text-gray-600 text-sm">설정을 선택해보세요</p>
            </motion.div>

            {/* 옵션 폼 카드 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-4"
            >
              <form onSubmit={handleGenerate} className="space-y-6">

                {/* 등장인물 수 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-900">등장인물 수</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                        <div className={`p-2 border rounded-lg transition-all cursor-pointer ${
                          option.available
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        }`}>
                          <div className="text-center space-y-1">
                            <div className={`text-sm ${!option.available ? 'grayscale' : ''}`}>{option.icon}</div>
                            <div className={`text-xs font-medium ${
                              option.available ? 'text-gray-900 peer-checked:text-blue-600' : 'text-gray-500'
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
                <div className="space-y-3">
                  <label className="flex items-center text-sm font-medium text-gray-800">
                    <Film className="w-4 h-4 mr-2 text-purple-500" />
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
                <div className="space-y-3">
                  <label className="flex items-center text-sm font-medium text-gray-800">
                    <Clock className="w-4 h-4 mr-2 text-purple-500" />
                    대본 길이
                  </label>
                  <div className="space-y-2">
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
                        <div className="p-3 border rounded-lg cursor-pointer transition-all bg-gray-50 border-gray-200 hover:bg-gray-100 peer-checked:bg-purple-50 peer-checked:border-purple-500">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg">{length.icon}</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{length.label}</div>
                              <div className="text-xs text-gray-500">{length.time}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 성별 선택 (1인 독백일 때만) */}
                {parseInt(formData.characterCount) === 1 && (
                  <div className="space-y-3">
                    <label className="flex items-center text-sm font-medium text-gray-800">
                      <Users className="w-4 h-4 mr-2 text-purple-500" />
                      성별
                    </label>
                    <div className="grid grid-cols-3 gap-2">
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
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-blue-50 peer-checked:border-blue-500">
                            <div className="text-center">
                              <div className="text-sm mb-1">{gender.icon}</div>
                              <div className="text-xs font-medium text-gray-900">{gender.label}</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 연령대 선택 (1인 독백일 때만) */}
                {parseInt(formData.characterCount) === 1 && (
                  <div className="space-y-3">
                    <label className="flex items-center text-sm font-medium text-gray-800">
                      <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                      연령대
                    </label>
                    <div className="space-y-2">
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
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-indigo-50 peer-checked:border-indigo-500">
                            <div className="flex items-center space-x-3">
                              <div className="text-lg">{age.icon}</div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{age.label}</div>
                                <div className="text-xs text-gray-600">{age.description}</div>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 다중 캐릭터 상세 설정 */}
                {parseInt(formData.characterCount) > 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">인물 설정</h3>
                    </div>

                    <div className="space-y-3">
                      {formData.characters.map((character, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-3">
                            {/* 인물 이름 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                인물 이름
                              </label>
                              <input
                                type="text"
                                value={character.name}
                                onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder={`인물 ${index + 1}`}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* 성별 */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  성별
                                </label>
                                <select
                                  value={character.gender}
                                  onChange={(e) => handleCharacterChange(index, 'gender', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value="">선택</option>
                                  {genders.map(gender => (
                                    <option key={gender.value} value={gender.value}>{gender.label}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 연령대 */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  연령대
                                </label>
                                <select
                                  value={character.age}
                                  onChange={(e) => handleCharacterChange(index, 'age', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value="">선택</option>
                                  {ages.slice(0, 5).map(age => (
                                    <option key={age.value} value={age.value}>{age.label.split('(')[0].trim()}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* 역할 */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  역할
                                </label>
                                <select
                                  value={character.roleType}
                                  onChange={(e) => handleCharacterChange(index, 'roleType', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                                  min="0"
                                  max="100"
                                  value={character.percentage}
                                  onChange={(e) => handlePercentageChange(index, e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                              </div>
                            </div>

                            {/* 관계 설정 (첫 번째 캐릭터가 아닌 경우) */}
                            {index > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    관계 대상
                                  </label>
                                  <select
                                    value={character.relationshipWith}
                                    onChange={(e) => handleCharacterChange(index, 'relationshipWith', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    {formData.characters.slice(0, index).map((char, i) => (
                                      <option key={i} value={char.name}>{char.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    관계
                                  </label>
                                  <select
                                    value={character.relationshipType}
                                    onChange={(e) => handleCharacterChange(index, 'relationshipType', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    <option value="친구">친구</option>
                                    <option value="연인">연인</option>
                                    <option value="가족">가족</option>
                                    <option value="동료">동료</option>
                                    <option value="라이벌">라이벌</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* 총 분량 체크 */}
                      <div className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                          formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0) === 100
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          총 분량: {formData.characters.reduce((sum, char) => sum + (char.percentage || 0), 0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 생성 버튼 */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isGenerating || !usageData.canGenerate}
                    className={`w-full py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      isGenerating || !usageData.canGenerate
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-lg'
                    } text-white shadow-md`}
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>생성 중...</span>
                      </div>
                    ) : !usageData.canGenerate ? (
                      <div className="flex items-center justify-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>사용량 초과</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Wand2 className="w-4 h-4" />
                        <span>🎭 대본 생성하기</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>

              {/* 에러 메시지 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <X className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="ml-2">
                        <div className="text-xs text-red-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* 오른쪽 대본 표시 영역 (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full min-h-[600px] sticky top-4">
              {generatedScript ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col"
                >
                  {/* 대본 헤더 */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">생성된 대본</h3>
                      <div className="flex space-x-2 mt-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          일반 대본
                        </span>
                        {formData.genre && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {formData.genre}
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>

                  {/* 대본 내용 */}
                  <div className="flex-1 overflow-y-auto mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <ScriptRenderer script={generatedScript} />
                    </div>
                  </div>

                  {/* 최종 프롬프트 (접이식) */}
                  {finalPrompt && (
                    <details className="mb-6">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        최종 프롬프트 보기
                      </summary>
                      <div className="mt-3 bg-blue-50 rounded-lg p-3">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {finalPrompt}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* 액션 버튼들 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedScript);
                        toast.success('대본이 클립보드에 복사되었습니다!');
                      }}
                      className="flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      복사
                    </button>
                    <button
                      onClick={() => navigate('/script-vault')}
                      className="flex items-center justify-center px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      대본함
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedScript('');
                        setFinalPrompt('');
                        setError('');
                      }}
                      className="flex items-center justify-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      다시 생성
                    </button>
                    <button
                      onClick={() => navigate('/ai-script')}
                      className="flex items-center justify-center px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      템플릿
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">대본이 여기에 표시됩니다</h3>
                    <p className="text-gray-500">왼쪽에서 옵션을 설정하고 '대본 생성하기' 버튼을 눌러주세요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralScript;