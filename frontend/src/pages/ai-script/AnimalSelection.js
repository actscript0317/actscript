import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, RotateCcw } from 'lucide-react';
import Dropdown from '../../components/common/Dropdown';

const AnimalSelection = ({
  availableAnimals,
  selectedAnimals,
  selectedScriptLength,
  lengths,
  onAnimalToggle,
  onAnimalPercentageChange,
  onAnimalRoleChange,
  onScriptLengthChange,
  onComplete,
  onBack,
  isLengthDropdownOpen,
  setIsLengthDropdownOpen
}) => {
  const totalPercentage = selectedAnimals.reduce((sum, animal) => sum + animal.percentage, 0);
  const isValid = selectedAnimals.length > 0 && totalPercentage === 100;

  // 비율 자동 균등 분배
  const handleAutoDistribute = () => {
    if (selectedAnimals.length === 0) return;
    
    const equalPercentage = Math.floor(100 / selectedAnimals.length);
    const remainder = 100 % selectedAnimals.length;
    
    selectedAnimals.forEach((animal, index) => {
      const percentage = index < remainder ? equalPercentage + 1 : equalPercentage;
      onAnimalPercentageChange(animal.value, percentage);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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
            동물 친구들 선택
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            연극에 등장할 동물 친구들을 선택하고 역할을 정해주세요
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* 동물 선택 영역 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                동물 캐릭터 선택
              </h2>
              
              {/* 동물 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableAnimals.map((animal) => {
                  const isSelected = selectedAnimals.some(a => a.value === animal.value);
                  return (
                    <motion.div
                      key={animal.value}
                      onClick={() => onAnimalToggle(animal)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-3xl">{animal.icon}</div>
                        <div className="font-medium text-sm text-gray-900">
                          {animal.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {animal.personality}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* 선택된 동물들 설정 */}
            {selectedAnimals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    선택된 동물들 ({selectedAnimals.length}마리)
                  </h3>
                  <button
                    onClick={handleAutoDistribute}
                    className="flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    균등 분배
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedAnimals.map((animal, index) => (
                    <div key={animal.value} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{animal.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {animal.label} ({animal.name})
                            </div>
                            <div className="text-xs text-gray-500">
                              {animal.personality} • {animal.voiceStyle}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* 역할 선택 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            역할
                          </label>
                          <select
                            value={animal.roleType || '조연'}
                            onChange={(e) => onAnimalRoleChange(animal.value, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                            min="1"
                            max="100"
                            value={animal.percentage || 0}
                            onChange={(e) => onAnimalPercentageChange(animal.value, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 분량 합계 표시 */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">총 대사 분량:</span>
                    <span className={`font-semibold ${
                      totalPercentage === 100 ? 'text-green-600' : 
                      totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  {totalPercentage !== 100 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {totalPercentage > 100 ? 
                        `${totalPercentage - 100}% 초과됨` : 
                        `${100 - totalPercentage}% 부족함`
                      }
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 설정 및 생성 영역 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                대본 설정
              </h3>

              {/* 대본 길이 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대본 길이
                </label>
                <Dropdown
                  options={lengths.filter(l => l.available).map(l => `${l.label} (${l.time})`)}
                  value={selectedScriptLength ? `${lengths.find(l => l.value === selectedScriptLength)?.label} (${lengths.find(l => l.value === selectedScriptLength)?.time})` : ''}
                  onChange={(value) => {
                    const length = lengths.find(l => `${l.label} (${l.time})` === value);
                    onScriptLengthChange(length?.value || '');
                  }}
                  placeholder="길이를 선택하세요"
                  isOpen={isLengthDropdownOpen}
                  setIsOpen={setIsLengthDropdownOpen}
                />
              </div>

              {/* 선택 요약 */}
              {selectedAnimals.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">선택 요약</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>등장 동물: {selectedAnimals.length}마리</div>
                    <div>주연: {selectedAnimals.filter(a => a.roleType === '주연').length}마리</div>
                    <div>조연: {selectedAnimals.filter(a => (a.roleType || '조연') === '조연').length}마리</div>
                    {selectedScriptLength && (
                      <div>
                        길이: {lengths.find(l => l.value === selectedScriptLength)?.label}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 대본 생성 버튼 */}
              <button
                onClick={onComplete}
                disabled={!isValid || !selectedScriptLength}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  isValid && selectedScriptLength
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {!selectedAnimals.length 
                  ? '동물을 선택해주세요' 
                  : totalPercentage !== 100 
                    ? '대사 분량을 100%로 맞춰주세요'
                    : !selectedScriptLength
                      ? '대본 길이를 선택해주세요'
                      : '대본 생성하기'
                }
              </button>

              {selectedAnimals.length > 0 && totalPercentage !== 100 && (
                <div className="mt-3 text-xs text-gray-500 text-center">
                  '균등 분배' 버튼을 사용하면 자동으로 100%가 됩니다
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimalSelection;