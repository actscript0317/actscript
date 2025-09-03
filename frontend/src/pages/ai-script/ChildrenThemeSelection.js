import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, ChevronDown, ArrowRight } from 'lucide-react';

const ChildrenThemeSelection = ({ childrenThemes, onThemeSelect, onBack }) => {
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedScriptLength, setSelectedScriptLength] = useState('medium');
  const [showLengthSelection, setShowLengthSelection] = useState(false);

  // 대본 길이 옵션
  const lengths = [
    { value: 'short', label: '짧게', time: '1~2분 (약 12~16줄)', icon: '⚡', available: true },
    { value: 'medium', label: '중간', time: '3~5분 (약 25~35줄)', icon: '⏱️', available: true },
    { value: 'long', label: '길게', time: '5~10분 (약 50~70줄)', icon: '📝', available: true }
  ];

  const handleThemeClick = (theme) => {
    setSelectedTheme(theme);
    setShowLengthSelection(true);
  };

  const handleGenerateScript = () => {
    if (selectedTheme && selectedScriptLength) {
      onThemeSelect(selectedTheme.value, selectedScriptLength);
    }
  };

  const handleBackFromLength = () => {
    setShowLengthSelection(false);
    setSelectedTheme(null);
  };
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

        {/* 대본 길이 선택 화면 */}
        <AnimatePresence mode="wait">
          {showLengthSelection ? (
            <motion.div
              key="length-selection"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              {/* 선택된 테마 표시 */}
              <div className="text-center">
                <div className="inline-flex items-center bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-4xl mr-4">{selectedTheme?.icon}</div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{selectedTheme?.label}</h3>
                    <p className="text-sm text-gray-600">{selectedTheme?.genre}</p>
                  </div>
                </div>
              </div>

              {/* 대본 분량 설정 */}
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl font-semibold text-center text-gray-900 mb-8">대본 분량을 설정해주세요</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {lengths.map((length, index) => (
                    <motion.div
                      key={length.value}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedScriptLength(length.value)}
                      className={`group bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                        selectedScriptLength === length.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-center space-y-4">
                        <div className={`text-4xl transition-transform duration-300 group-hover:scale-110 ${
                          selectedScriptLength === length.value ? 'scale-110' : ''
                        }`}>
                          {length.icon}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className={`text-xl font-semibold transition-colors ${
                            selectedScriptLength === length.value ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-600'
                          }`}>
                            {length.label}
                          </h4>
                          <p className={`text-sm ${
                            selectedScriptLength === length.value ? 'text-purple-600' : 'text-gray-500'
                          }`}>
                            {length.time}
                          </p>
                        </div>
                        
                        {selectedScriptLength === length.value && (
                          <div className="pt-2">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex justify-between items-center max-w-4xl mx-auto pt-8">
                <button
                  onClick={handleBackFromLength}
                  className="flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  테마 다시 선택
                </button>
                
                <button
                  onClick={handleGenerateScript}
                  className="flex items-center px-8 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
                >
                  대본 생성하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* 테마 카드들 */
            <motion.div
              key="theme-selection"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {childrenThemes.map((theme, index) => (
                <motion.div
                  key={theme.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleThemeClick(theme)}
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
            </motion.div>
          )}
        </AnimatePresence>

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