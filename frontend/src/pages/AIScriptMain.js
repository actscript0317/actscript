import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  ArrowRight,
  Wand2
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

  // 템플릿 선택 처리
  const handleTemplateSelect = (templateValue) => {
    const template = templates.find(t => t.value === templateValue);
    setSelectedTemplate(template);

    // 해당 페이지로 이동
    navigate(template.path);
  };

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
};

export default AIScriptMain;