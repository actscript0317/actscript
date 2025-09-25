import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AIScriptMain = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // 사용량 정보 가져오기
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

  // 템플릿 데이터 (일반 대본을 첫 번째로, 나머지는 개발 중)
  const templates = [
    {
      value: 'general',
      label: '일반 대본',
      description: '자유로운 설정으로 다양한 상황의 대본',
      icon: '🎭',
      path: '/ai-script/general',
      available: true
    },
    {
      value: 'school',
      label: '학교 연극',
      description: '학교 발표회나 축제에 적합한 연극',
      icon: '🎒',
      path: '/ai-script/school',
      available: false,
      comingSoon: true
    },
    {
      value: 'family',
      label: '가족 연극',
      description: '온 가족이 함께 즐길 수 있는 연극',
      icon: '👨‍👩‍👧‍👦',
      path: '/ai-script/family',
      available: false,
      comingSoon: true
    }
  ];

  // 템플릿 선택 처리
  const handleTemplateSelect = (templateValue) => {
    const template = templates.find(t => t.value === templateValue);

    if (!template.available) {
      // 개발 중인 템플릿은 클릭 불가
      return;
    }

    setSelectedTemplate(template);

    // 해당 페이지로 이동
    navigate(template.path);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* 사용량 표시 바 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-900 text-sm">
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
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
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

        {/* 메인 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <span className="text-green-600 font-bold text-5xl tracking-wide">QueOn</span>
          </motion.div>
          <p className="text-gray-700 text-lg max-w-md mx-auto leading-relaxed">
            원하는 템플릿을 선택해서<br />
            맞춤형 대본을 만들어보세요
          </p>
        </motion.div>

        {/* 템플릿 카드들 */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl w-full">
          {templates.map((template, index) => (
            <motion.div
              key={template.value}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={template.available ? { y: -4 } : {}}
              className={`group ${index === 0 ? 'sm:col-span-1' : ''} ${!template.available ? 'opacity-60' : ''}`}
            >
              <div className="relative">
                <button
                  onClick={() => handleTemplateSelect(template.value)}
                  disabled={!template.available}
                  className={`w-full p-6 bg-white border border-gray-200 rounded-2xl transition-all duration-300 text-left relative overflow-hidden ${
                    template.available
                      ? 'hover:border-green-300 hover:shadow-lg cursor-pointer'
                      : 'cursor-not-allowed border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* 개발 중 오버레이 */}
                  {!template.available && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
                      <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        개발 중
                      </div>
                    </div>
                  )}

                  {/* 아이콘 */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                    template.available
                      ? 'bg-green-50 group-hover:bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">{template.icon}</span>
                  </div>

                  {/* 제목 */}
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${
                    template.available
                      ? 'text-gray-900 group-hover:text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {template.label}
                  </h3>

                  {/* 설명 */}
                  <p className={`text-sm leading-relaxed mb-4 ${
                    template.available ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {template.description}
                  </p>

                  {/* 액션 */}
                  <div className={`flex items-center font-medium text-sm ${
                    template.available ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <span>{template.available ? '시작하기' : '준비 중'}</span>
                    {template.available && (
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>
              </div>
            </motion.div>
          ))}
          </div>
        </div>

        {/* 하단 안내 문구 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm">
            각 템플릿에 맞는 옵션을 설정하여 나만의 대본을 만들어보세요
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AIScriptMain;