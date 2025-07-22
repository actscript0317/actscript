import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, 
  Users, 
  Palette, 
  Heart, 
  Clock, 
  Wand2, 
  Copy, 
  Save, 
  RefreshCw,
  ChevronDown,
  X,
  MapPin,
  Film,
  PenTool,
  Edit3,
  ArrowRight,
  Check,
  AlertCircle,
  BookOpen,
  Target,
  Zap,
  Maximize2,
  Archive,
  RotateCcw,
  Eye
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AIScript = () => {
  const { addAIGeneratedScript, addSavedScript } = useAuth();
  const navigate = useNavigate();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    characterCount: '',
    genre: '',
    emotions: [],
    length: '',
    situation: '',
    style: '',
    location: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatedScriptId, setGeneratedScriptId] = useState(null); // MongoDB에 저장된 스크립트 ID
  const [error, setError] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // 리라이팅 관련 상태
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextStart, setSelectedTextStart] = useState(0);
  const [selectedTextEnd, setSelectedTextEnd] = useState(0);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteIntensity, setRewriteIntensity] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState(null);
  
  // 상세 보기 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 옵션 데이터
  const characterOptions = [
    { value: '1', label: '1인 독백', icon: '👤' },
    { value: '2-3', label: '2~3인 대화', icon: '👥' },
    { value: '4+', label: '4인 이상 앙상블', icon: '👨‍👩‍👧‍👦' }
  ];

  const genres = [
    '로맨스', '코미디', '스릴러', '드라마', '액션', 
    '공포', '판타지', 'SF', '미스터리', '시대극'
  ];

  const emotions = [
    '기쁨', '슬픔', '분노', '사랑', '그리움', 
    '희망', '절망', '놀라움', '두려움', '평온'
  ];

  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분', icon: '⚡' },
    { value: 'medium', label: '중간', time: '3~5분', icon: '⏱️' },
    { value: 'long', label: '길게', time: '5~10분', icon: '📝' }
  ];

  const styles = [
    '웹드라마', '리얼리즘', '연극톤', '시트콤', '영화톤'
  ];

  const locations = [
    '병원', '카페', '거리', '경찰서', '학교', '집', '사무실', '공원', '버스', '지하철'
  ];

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 감정 토글 핸들러
  const toggleEmotion = (emotion) => {
    setFormData(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion]
    }));
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
        emotion: formData.emotions.join(', '),
        genre: formData.genre
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
  // 대본 파싱 및 렌더링 함수
  const parseAndRenderScript = (script) => {
    if (!script) return null;

    const lines = script.split('\n');
    const sections = [];
    let currentSection = { type: 'text', content: [] };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 섹션 헤더 감지
      if (trimmedLine.match(/^\*\*제목:\*\*/i) || trimmedLine.match(/^제목:/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'title', content: [line] };
      } else if (trimmedLine.match(/^\*\*상황[ ]?설명:\*\*/i) || trimmedLine.match(/^상황[ ]?설명:/i) || trimmedLine.match(/^\[상황[ ]?설명\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'situation', content: [line] };
      } else if (trimmedLine.match(/^\*\*인물:\*\*/i) || trimmedLine.match(/^인물:/i) || trimmedLine.match(/^\[등장인물\]/i) || trimmedLine.match(/^\[인물\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'character', content: [line] };
      } else if (trimmedLine.match(/^\*\*독백:\*\*/i) || trimmedLine.match(/^독백:/i) || trimmedLine.match(/^\[독백\]/i) || trimmedLine.match(/^\*\*대본:\*\*/i) || trimmedLine.match(/^대본:/i) || trimmedLine.match(/^\[대본\]/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'dialogue', content: [line] };
      } else if (trimmedLine.match(/^\*\*연기[ ]?팁:\*\*/i) || trimmedLine.match(/^연기[ ]?팁:/i) || trimmedLine.match(/^\*\*연기[ ]?포인트:\*\*/i)) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { type: 'tips', content: [line] };
      } else {
        currentSection.content.push(line);
      }
    });

    if (currentSection.content.length > 0) sections.push(currentSection);

    return sections.map((section, index) => {
      const content = section.content.join('\n');
      
      switch (section.type) {
        case 'title':
          return (
            <div key={index} className="mb-6">
              <div className="text-2xl font-bold text-center text-purple-900 bg-gradient-to-r from-purple-100 to-pink-100 py-4 px-6 rounded-xl border-l-4 border-purple-500">
                {content.replace(/^\*\*제목:\*\*\s*/i, '').replace(/^제목:\s*/i, '')}
              </div>
            </div>
          );
        case 'situation':
          return (
            <div key={index} className="mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  상황 설명
                </h3>
                <div className="text-blue-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*상황[ ]?설명:\*\*\s*/i, '').replace(/^상황[ ]?설명:\s*/i, '').replace(/^\[상황[ ]?설명\]\s*/i, '')}
                </div>
              </div>
            </div>
          );
        case 'character':
          return (
            <div key={index} className="mb-6">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-green-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  등장인물
                </h3>
                <div className="text-green-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*인물:\*\*\s*/i, '').replace(/^인물:\s*/i, '').replace(/^\[등장인물\]\s*/i, '').replace(/^\[인물\]\s*/i, '')}
                </div>
              </div>
            </div>
          );
        case 'dialogue':
          return (
            <div key={index} className="mb-6">
              <div className="bg-gray-50 border-l-4 border-gray-400 p-6 rounded-r-lg">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  {section.content[0].includes('독백') ? '독백' : '대본'}
                </h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-base">
                    {content.replace(/^\*\*독백:\*\*\s*/i, '').replace(/^독백:\s*/i, '').replace(/^\[독백\]\s*/i, '').replace(/^\*\*대본:\*\*\s*/i, '').replace(/^대본:\s*/i, '').replace(/^\[대본\]\s*/i, '')}
                  </div>
                </div>
              </div>
            </div>
          );
        case 'tips':
          return (
            <div key={index} className="mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  연기 팁
                </h3>
                <div className="text-yellow-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {content.replace(/^\*\*연기[ ]?팁:\*\*\s*/i, '').replace(/^연기[ ]?팁:\s*/i, '').replace(/^\*\*연기[ ]?포인트:\*\*\s*/i, '')}
                </div>
              </div>
            </div>
          );
        default:
          return (
            <div key={index} className="mb-4">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          );
      }
    });
  };

  // 대본에서 제목 추출 함수
  const extractTitleFromScript = (scriptContent) => {
    if (!scriptContent) return '제목 없음';
    
    const lines = scriptContent.split('\n');
    
    // 제목을 찾는 여러 패턴 시도
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // "제목:" 또는 "**제목:**" 패턴
      if (trimmedLine.match(/^\*\*제목:\*\*/i)) {
        let title = trimmedLine.replace(/^\*\*제목:\*\*\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
      
      if (trimmedLine.match(/^제목:/i)) {
        let title = trimmedLine.replace(/^제목:\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
    }
    
    // 제목이 없으면 빈 문자열 반환
    return '';
  };

  const closeRewriteModal = () => {
    setShowRewriteModal(false);
    setSelectedText('');
    setSelectedTextStart(0);
    setSelectedTextEnd(0);
    setRewriteResult(null);
    setRewriteIntensity('');
    window.getSelection().removeAllRanges();
  };

  // 대본 생성 핸들러
  const handleGenerate = async (e) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!formData.characterCount || !formData.genre || formData.emotions.length === 0 || !formData.length) {
      setError('필수 항목을 모두 선택해주세요. (등장인물 수, 장르, 주요 감정, 대본 길이)');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedScript('');

    try {
      const response = await api.post('/ai-script/generate', {
        characterCount: formData.characterCount,
        genre: formData.genre,
        emotion: formData.emotions.join(', '),
        length: formData.length,
        situation: formData.situation,
        style: formData.style,
        location: formData.location
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || '대본 생성에 실패했습니다.');
      }

      setGeneratedScript(data.script);
      setGeneratedScriptId(data.scriptId); // 백엔드에서 반환된 스크립트 ID 저장
      
      // AI 생성 대본을 자동으로 저장하지 않고, 사용자가 저장 버튼을 눌렀을 때만 저장
      // if (addAIGeneratedScript) {
      //   addAIGeneratedScript({
      //     title: `${formData.genre} ${formData.emotions.join(', ')} 대본`,
      //     content: data.script,
      //     characterCount: formData.characterCount,
      //     genre: formData.genre,
      //     emotion: formData.emotions.join(', '),
      //     metadata: data.metadata
      //   });
      // }
      
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
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {option}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 페이지 헤더 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              AI 대본 생성기
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              몇 가지 설정만으로 당신만의 특별한 연기 대본을 생성하세요
            </p>
          </motion.div>

          {/* 메인 폼 카드 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8"
          >
            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* 등장인물 수 */}
              <div className="space-y-4">
                <label className="flex items-center text-lg font-semibold text-gray-800">
                  <Users className="w-6 h-6 mr-3 text-purple-500" />
                  등장인물 수
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {characterOptions.map((option) => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="characterCount"
                        value={option.value}
                        onChange={(e) => handleInputChange('characterCount', e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-purple-50 peer-checked:border-purple-500 peer-checked:shadow-md">
                        <div className="text-center">
                          <div className="text-2xl mb-2">{option.icon}</div>
                          <div className="font-medium text-gray-900">{option.label}</div>
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
                <Dropdown
                  options={genres}
                  value={formData.genre}
                  onChange={(value) => handleInputChange('genre', value)}
                  placeholder="장르를 선택하세요"
                  isOpen={showGenreDropdown}
                  setIsOpen={setShowGenreDropdown}
                />
              </div>

              {/* 주요 감정 (멀티 셀렉트) */}
              <div className="space-y-4">
                <label className="flex items-center text-lg font-semibold text-gray-800">
                  <Heart className="w-6 h-6 mr-3 text-purple-500" />
                  주요 감정 <span className="text-sm text-gray-500 ml-2">(복수 선택 가능)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {emotions.map((emotion) => (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => toggleEmotion(emotion)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                        formData.emotions.includes(emotion)
                          ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-md'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
                {formData.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.emotions.map((emotion) => (
                      <span key={emotion} className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                        {emotion}
                        <X 
                          className="w-4 h-4 ml-1 cursor-pointer hover:text-pink-600" 
                          onClick={() => toggleEmotion(emotion)}
                        />
                      </span>
                    ))}
                  </div>
                )}
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
                        onChange={(e) => handleInputChange('length', e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-gray-100 peer-checked:bg-gradient-to-r peer-checked:from-purple-50 peer-checked:to-pink-50 peer-checked:border-purple-500 peer-checked:shadow-md">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 스타일 선택 */}
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Palette className="w-6 h-6 mr-3 text-purple-500" />
                    스타일 <span className="text-sm text-gray-500 ml-2">(선택사항)</span>
                  </label>
                  <Dropdown
                    options={styles}
                    value={formData.style}
                    onChange={(value) => handleInputChange('style', value)}
                    placeholder="스타일을 선택하세요"
                    isOpen={showStyleDropdown}
                    setIsOpen={setShowStyleDropdown}
                  />
                </div>

                {/* 배경 장소 */}
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <MapPin className="w-6 h-6 mr-3 text-purple-500" />
                    배경 장소 <span className="text-sm text-gray-500 ml-2">(선택사항)</span>
                  </label>
                  <Dropdown
                    options={locations}
                    value={formData.location}
                    onChange={(value) => handleInputChange('location', value)}
                    placeholder="장소를 선택하세요"
                    isOpen={showLocationDropdown}
                    setIsOpen={setShowLocationDropdown}
                  />
                </div>
              </div>

              {/* 상황 설명 */}
              <div className="space-y-4">
                <label className="flex items-center text-lg font-semibold text-gray-800">
                  <PenTool className="w-6 h-6 mr-3 text-purple-500" />
                  상황 설명 <span className="text-sm text-gray-500 ml-2">(선택사항)</span>
                </label>
                <textarea
                  value={formData.situation}
                  onChange={(e) => handleInputChange('situation', e.target.value)}
                  placeholder="예: 카페에서 전 애인을 만나는 장면"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                  rows={3}
                />
              </div>

              {/* 생성 버튼 */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className={`w-full py-4 px-8 text-xl font-semibold rounded-xl transition-all duration-300 ${
                    isGenerating
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
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-8"
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

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">생성된 대본</h3>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {formData.characterCount}명
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {formData.genre}
                      </span>
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full">
                        {formData.emotions.join(', ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-700">
                      <Edit3 className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">✨ 리라이팅 기능: 수정하고 싶은 대사나 문장을 드래그로 선택하면 AI가 더 나은 표현으로 바꿔줍니다 (최소 5자 이상)</span>
                    </div>
                  </div>
                  
                  <div 
                    className="bg-white rounded-lg p-6 border border-gray-200 max-h-96 overflow-y-auto cursor-text select-text"
                    onMouseUp={handleTextSelection}
                  >
                    {parseAndRenderScript(generatedScript)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <button
                    onClick={() => setShowDetailModal(true)}
                    className="flex items-center justify-center px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md"
                  >
                    <Maximize2 className="w-5 h-5 mr-2" />
                    👁️ 자세히 보기
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedScript);
                      toast.success('대본이 클립보드에 복사되었습니다!');
                    }}
                    className="flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md"
                  >
                    <Copy className="w-5 h-5 mr-2" />
                    📄 복사하기
                  </button>
                  <button
                    onClick={() => {
                      try {
                        if (generatedScriptId) {
                          // MongoDB에 저장된 AI 스크립트를 대본함에 저장
                          if (addSavedScript) {
                            addSavedScript({ scriptId: generatedScriptId });
                            // 성공 메시지와 함께 대본함으로 이동
                            toast.success('대본이 성공적으로 저장되었습니다! 대본함으로 이동합니다.');
                            setTimeout(() => {
                              navigate('/script-vault');
                            }, 1000);
                          } else {
                            toast.error('저장 기능에 오류가 있습니다. 페이지를 새로고침한 후 다시 시도해주세요.');
                          }
                        } else {
                          toast.error('스크립트 ID가 없습니다. 다시 생성해주세요.');
                        }
                      } catch (error) {
                        console.error('저장 중 오류:', error);
                        toast.error('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
                      }
                    }}
                    className="flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-md"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    🔖 저장하기
                  </button>
                  <button
                    onClick={() => navigate('/script-vault')}
                    className="flex items-center justify-center px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md"
                  >
                    <Archive className="w-5 h-5 mr-2" />
                    📚 대본함 가기
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedScript('');
                      setError('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center justify-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    🔁 다시 생성
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
                          <Edit3 className="w-6 h-6 text-white" />
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
                            value: 'emotion', 
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
                            다시하기
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 대본 상세 보기 모달 */}
          <AnimatePresence>
            {showDetailModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                onClick={() => setShowDetailModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-5xl w-full max-h-[95vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 헤더 */}
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">대본 자세히 보기</h2>
                          <p className="text-gray-600">생성된 대본을 크고 명확하게 확인하세요</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {formData.characterCount}명
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {formData.genre}
                          </span>
                          <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full">
                            {formData.emotions.join(', ')}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowDetailModal(false)}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 대본 내용 */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {parseAndRenderScript(generatedScript)}
                      </div>
                    </div>
                  </div>

                  {/* 하단 액션 버튼 */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedScript);
                          toast.success('대본이 클립보드에 복사되었습니다!');
                        }}
                        className="flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        복사하기
                      </button>
                      <button
                        onClick={() => {
                          try {
                            if (generatedScriptId) {
                              // MongoDB에 저장된 AI 스크립트를 대본함에 저장
                              if (addSavedScript) {
                                addSavedScript({ scriptId: generatedScriptId });
                                // 성공 메시지와 함께 대본함으로 이동
                                toast.success('대본이 성공적으로 저장되었습니다! 대본함으로 이동합니다.');
                                setTimeout(() => {
                                  navigate('/script-vault');
                                }, 1000);
                              } else {
                                toast.error('저장 기능에 오류가 있습니다. 페이지를 새로고침한 후 다시 시도해주세요.');
                              }
                            } else {
                              toast.error('스크립트 ID가 없습니다. 다시 생성해주세요.');
                            }
                          } catch (error) {
                            console.error('저장 중 오류:', error);
                            toast.error('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
                          }
                        }}
                        className="flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Save className="w-5 h-5 mr-2" />
                        저장하기
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          setShowRewriteModal(true);
                        }}
                        className="flex items-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Edit3 className="w-5 h-5 mr-2" />
                        리라이팅하기
                      </button>
                      <button
                        onClick={() => navigate('/script-vault')}
                        className="flex items-center px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <Archive className="w-5 h-5 mr-2" />
                        대본함 가기
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        인쇄하기
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
};

export default AIScript; 