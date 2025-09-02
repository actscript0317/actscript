import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChildrenTheater = () => {
  const navigate = useNavigate();

  const handleBackToTemplates = () => {
    navigate('/ai-script');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            어린이 연극 대본 생성
          </h1>
          <p className="text-gray-600 mb-8">
            현재 개발 중입니다. 곧 만나보실 수 있습니다!
          </p>
          <button
            onClick={handleBackToTemplates}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            템플릿 선택으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChildrenTheater;