import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const TemplateSelection = ({ templates, onTemplateSelect, ageMap }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-200/50 text-blue-600 text-sm font-medium mb-6">
            <Sparkles size={16} />
            AI 대본 생성기
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            원하는 템플릿을 선택하세요
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-base">
            각 템플릿은 특별히 최적화된 AI 프롬프트로 완벽한 대본을 생성합니다
          </p>
        </motion.div>

        {/* 템플릿 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template, index) => (
            <motion.div
              key={template.value}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              onClick={() => onTemplateSelect(template.value)}
              className="group relative bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200/50 hover:-translate-y-1"
            >
              {/* 카드 콘텐츠 */}
              <div className="space-y-4">
                {/* 아이콘 */}
                <div className="flex items-center justify-between">
                  <div className="text-3xl transition-transform duration-300 group-hover:scale-110">
                    {template.icon}
                  </div>
                  <ArrowRight 
                    size={18} 
                    className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" 
                  />
                </div>
                
                {/* 제목과 설명 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {template.label}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                    {template.description}
                  </p>
                </div>
                
                {/* 기본 설정 태그 */}
                {template.defaultSettings && Object.keys(template.defaultSettings).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {template.defaultSettings.age && (
                      <span className="inline-flex px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-xs font-medium">
                        {ageMap[template.defaultSettings.age] || template.defaultSettings.age}
                      </span>
                    )}
                    {template.defaultSettings.genre && (
                      <span className="inline-flex px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-xs font-medium">
                        {template.defaultSettings.genre}
                      </span>
                    )}
                    {template.defaultSettings.characterCount && (
                      <span className="inline-flex px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-xs font-medium">
                        {template.defaultSettings.characterCount}명
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 호버 시 나타나는 그라데이션 보더 */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TemplateSelection;