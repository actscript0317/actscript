import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const TemplateSelection = ({ templates, onTemplateSelect, ageMap }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            AI 대본 생성기
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            원하는 템플릿을 선택하여 완벽한 대본을 생성하세요
          </p>
        </motion.div>

        {/* 템플릿 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {templates.map((template, index) => (
            <motion.div
              key={template.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onTemplateSelect(template.value)}
              className="group bg-white rounded-3xl border border-gray-200 hover:border-gray-300 p-8 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1"
            >
              <div className="text-center space-y-6">
                <div className="text-5xl transition-transform duration-300 group-hover:scale-110">
                  {template.icon}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {template.label}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {template.description}
                  </p>
                </div>
                
                {/* 기본 설정 태그 */}
                {template.defaultSettings && Object.keys(template.defaultSettings).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400 font-medium">기본 설정</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {template.defaultSettings.age && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                          {ageMap[template.defaultSettings.age] || template.defaultSettings.age}
                        </span>
                      )}
                      {template.defaultSettings.genre && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                          {template.defaultSettings.genre}
                        </span>
                      )}
                      {template.defaultSettings.characterCount && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                          {template.defaultSettings.characterCount}명
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <div className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium group-hover:bg-blue-600 transition-colors">
                    선택하기
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 간단한 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm max-w-3xl mx-auto">
            각 템플릿은 특별히 설계된 AI 프롬프트로 최적화되어 있습니다. 
            선택한 템플릿에 따라 맞춤형 옵션이 제공됩니다.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default TemplateSelection;