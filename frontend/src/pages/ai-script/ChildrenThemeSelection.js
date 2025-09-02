import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const ChildrenThemeSelection = ({ childrenThemes, onThemeSelect, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {/* 뒤로가기 버튼 */}
          {onBack && (
            <motion.button
              onClick={onBack}
              className="absolute top-8 left-8 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </motion.button>
          )}

          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            어린이 연극 테마
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            아이들과 함께할 특별한 연극 테마를 선택하세요
          </p>
        </motion.div>

        {/* 테마 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {childrenThemes.map((theme, index) => (
            <motion.div
              key={theme.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onThemeSelect(theme.value)}
              className="group bg-white rounded-3xl border border-gray-200 hover:border-gray-300 p-8 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1"
            >
              <div className="text-center space-y-6">
                <div className="text-6xl transition-transform duration-300 group-hover:scale-110">
                  {theme.icon}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {theme.label}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {theme.description}
                  </p>
                </div>
                
                {/* 장르 태그 */}
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                    {theme.genre}
                  </span>
                </div>
                
                <div className="pt-4">
                  <div className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium group-hover:bg-purple-600 transition-colors">
                    선택하기
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm max-w-3xl mx-auto">
            각 테마는 어린이의 발달 단계와 흥미를 고려하여 특별히 설계되었습니다. 
            선택한 테마에 따라 맞춤형 캐릭터와 스토리가 제공됩니다.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default ChildrenThemeSelection;