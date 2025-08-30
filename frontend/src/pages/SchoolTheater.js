import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Archive, 
  Edit3, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SchoolTheater = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 상태 관리
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    theme: 'friendship',
    participants: '20-30',
    duration: 'medium',
    grade: 'elementary'
  });

  // 테마 옵션
  const themes = [
    { value: 'friendship', label: '우정과 협력', icon: '🤝' },
    { value: 'environment', label: '환경 보호', icon: '🌱' },
    { value: 'dream', label: '꿈과 희망', icon: '✨' },
    { value: 'history', label: '역사 이야기', icon: '📚' }
  ];

  // 참가자 수 옵션
  const participantOptions = [
    { value: '10-15', label: '소규모 (10-15명)' },
    { value: '20-30', label: '중규모 (20-30명)' },
    { value: '30+', label: '대규모 (30명 이상)' }
  ];

  // 소요시간 옵션
  const durations = [
    { value: 'short', label: '짧음 (5-10분)' },
    { value: 'medium', label: '중간 (10-20분)' },
    { value: 'long', label: '길음 (20-30분)' }
  ];

  // 학년 옵션
  const grades = [
    { value: 'elementary', label: '초등학교' },
    { value: 'middle', label: '중학교' },
    { value: 'high', label: '고등학교' }
  ];

  // 대본 생성
  const handleGenerate = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedScript('');
    setProgress(0);

    try {
      const prompt = `${grades.find(g => g.value === formData.grade)?.label} ${themes.find(t => t.value === formData.theme)?.label} 주제의 학교 연극 대본을 작성해주세요. 참가자는 ${participantOptions.find(p => p.value === formData.participants)?.label}이며, 공연시간은 ${durations.find(d => d.value === formData.duration)?.label}입니다.`;
      
      setFinalPrompt(prompt);

      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setProgress(Math.min(currentProgress, 90));
      }, 500);

      // 임시 응답 (실제로는 API 호출)
      setTimeout(() => {
        clearInterval(progressInterval);
        setProgress(100);
        
        const sampleScript = `===제목===
${themes.find(t => t.value === formData.theme)?.label} - ${grades.find(g => g.value === formData.grade)?.label} 연극

===상황 설명===
${grades.find(g => g.value === formData.grade)?.label} 학생들이 ${themes.find(t => t.value === formData.theme)?.label}을 주제로 펼치는 의미 있는 이야기입니다.

===등장인물===
나레이터: 이야기를 이끌어가는 역할
주인공들: ${participantOptions.find(p => p.value === formData.participants)?.label}의 학생들이 다양한 역할 분담

===대본===
나레이터: 안녕하세요, 여러분! 오늘은 ${themes.find(t => t.value === formData.theme)?.label}에 대한 특별한 이야기를 들려드리려고 합니다.

[학생들이 무대에 등장]

학생1: 우리가 함께하면 더 큰 힘이 될 수 있어요!
학생2: 맞아요, 혼자서는 할 수 없는 일도 함께하면 가능해져요.

[더 많은 대사와 상황 전개...]`;

        setGeneratedScript(sampleScript);
        toast.success('🎒 학교 연극 대본이 생성되었습니다!');
        
        setTimeout(() => {
          setProgress(0);
        }, 1000);
      }, 3000);

    } catch (error) {
      console.error('대본 생성 오류:', error);
      setError('대본 생성 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/ai-script')}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>템플릿 선택으로 돌아가기</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                🎒 학교 연극 대본
              </h1>
              <p className="text-lg text-gray-600">
                학교 발표회와 축제에 적합한 연극 대본을 생성하세요
              </p>
            </div>
            
            <div className="w-32"></div>
          </div>

          {/* 옵션 설정 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">연극 설정</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 테마 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">연극 테마</label>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setFormData(prev => ({ ...prev, theme: theme.value }))}
                      className={`p-3 rounded-lg border transition-colors flex items-center space-x-2 ${
                        formData.theme === theme.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{theme.icon}</span>
                      <span className="text-sm">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 참가자 수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">참가자 수</label>
                <div className="space-y-2">
                  {participantOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormData(prev => ({ ...prev, participants: option.value }))}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        formData.participants === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 소요시간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">공연 시간</label>
                <div className="space-y-2">
                  {durations.map((duration) => (
                    <button
                      key={duration.value}
                      onClick={() => setFormData(prev => ({ ...prev, duration: duration.value }))}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        formData.duration === duration.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 학년 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">대상 학년</label>
                <div className="space-y-2">
                  {grades.map((grade) => (
                    <button
                      key={grade.value}
                      onClick={() => setFormData(prev => ({ ...prev, grade: grade.value }))}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        formData.grade === grade.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 생성 버튼 */}
            <div className="text-center mt-8">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isGenerating ? '대본 생성 중...' : '🎒 대본 생성하기'}
              </button>
            </div>
          </motion.div>

          {/* 진행바 */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">🎒 학교 연극 대본 생성 중...</h3>
                <p className="text-gray-600 mt-2">교육적이고 의미 있는 대본을 작성하고 있어요</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full"
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

          {/* 에러 메시지 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6"
            >
              <p className="text-red-700">{error}</p>
            </motion.div>
          )}

          {/* 생성된 대본 결과 */}
          {generatedScript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">🎒 학교 연극 대본 생성 완료!</h2>
                <p className="text-gray-600">생성된 대본을 확인하고 학교 발표회에 활용해보세요.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-800">📚 학교 연극 대본</h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="px-2 py-1 sm:px-3 bg-purple-100 text-purple-700 rounded-full">
                      {participantOptions.find(p => p.value === formData.participants)?.label}
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-blue-100 text-blue-700 rounded-full">
                      {themes.find(t => t.value === formData.theme)?.label}
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-700 rounded-full">
                      {grades.find(g => g.value === formData.grade)?.label}
                    </span>
                    <span className="px-2 py-1 sm:px-3 bg-orange-100 text-orange-700 rounded-full">
                      {durations.find(d => d.value === formData.duration)?.label}
                    </span>
                  </div>
                </div>
                
                <div 
                  className="bg-white rounded-lg p-3 sm:p-4 md:p-6 border border-gray-200 max-h-[60vh] overflow-y-auto cursor-text select-text text-sm sm:text-base leading-relaxed"
                >
                  <pre className="whitespace-pre-wrap font-sans">{generatedScript}</pre>
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
        </div>
      </div>
    </div>
  );
};

export default SchoolTheater;