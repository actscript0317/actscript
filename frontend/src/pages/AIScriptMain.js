import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const AIScriptMain = () => {
  const navigate = useNavigate();

  const templates = [
    {
      value: 'children',
      label: '어린이 연극',
      description: '5~12세 어린이를 위한 교육적이고 재미있는 연극 대본',
      icon: '🧒',
      color: 'from-green-400 to-blue-500',
      path: '/ai-script/children',
      features: ['동물 캐릭터', '교육적 내용', '상호작용형']
    },
    {
      value: 'school',
      label: '학교 연극',
      description: '학교 발표회나 축제에 적합한 연극 대본',
      icon: '🎒',
      color: 'from-blue-400 to-purple-500',
      path: '/ai-script/school',
      features: ['학급 참여', '교과 연계', '발표회 최적화']
    },
    {
      value: 'family',
      label: '가족 연극',
      description: '온 가족이 함께 즐길 수 있는 연극 대본',
      icon: '👨‍👩‍👧‍👦',
      color: 'from-purple-400 to-pink-500',
      path: '/ai-script/family',
      features: ['전 연령 참여', '가족 유대', '감동적인 스토리']
    },
    {
      value: 'general',
      label: '일반 대본',
      description: '자유로운 설정으로 다양한 상황의 대본 생성',
      icon: '🎭',
      color: 'from-pink-400 to-orange-500',
      path: '/ai-script/general',
      features: ['자유 설정', '다양한 장르', '맞춤형 옵션']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 py-4 sm:py-8 md:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 헤더 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              AI 대본 생성
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              원하는 템플릿을 선택하여 AI가 만드는 전문적인 대본을 경험해보세요
            </p>
            
            {/* 기능 소개 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-semibold text-gray-900 mb-2">AI 기반 생성</h3>
                <p className="text-gray-600 text-sm">최신 AI 기술로 창의적이고 자연스러운 대본 생성</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">맞춤형 옵션</h3>
                <p className="text-gray-600 text-sm">연령대, 장르, 인원수 등 세부 조건 설정 가능</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">빠른 생성</h3>
                <p className="text-gray-600 text-sm">몇 분 안에 완성도 높은 대본 완성</p>
              </div>
            </div>
          </motion.div>

          {/* 템플릿 선택 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              템플릿을 선택해주세요
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {templates.map((template, index) => (
                <motion.div
                  key={template.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(template.path)}
                  className={`bg-gradient-to-r ${template.color} rounded-xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 group`}
                >
                  <div className="text-center">
                    <div className="text-5xl mb-4">{template.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{template.label}</h3>
                    <p className="text-sm opacity-90 mb-4">{template.description}</p>
                    
                    <div className="space-y-1 mb-4">
                      {template.features.map((feature, idx) => (
                        <div key={idx} className="text-xs bg-white bg-opacity-20 rounded-full px-2 py-1 inline-block mx-1">
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <span className="mr-2">선택하기</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 템플릿별 특징 안내 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <div className="bg-white rounded-xl shadow-md p-6 mx-auto max-w-4xl">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-gray-900">템플릿별 특징</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div className="space-y-2">
                  <div><strong className="text-green-600">🧒 어린이 연극:</strong> 동물 캐릭터, 교육적 메시지, 상호작용</div>
                  <div><strong className="text-blue-600">🎒 학교 연극:</strong> 학급 참여형, 교과 연계, 발표회 최적화</div>
                </div>
                <div className="space-y-2">
                  <div><strong className="text-purple-600">👨‍👩‍👧‍👦 가족 연극:</strong> 전 연령 참여, 가족 유대감 증진</div>
                  <div><strong className="text-pink-600">🎭 일반 대본:</strong> 자유로운 설정, 다양한 장르 선택</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AIScriptMain;