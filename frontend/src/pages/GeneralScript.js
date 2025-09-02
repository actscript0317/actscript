import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Archive, Edit3, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ScriptRenderer from '../components/common/ScriptRenderer';

const GeneralScript = () => {
  const location = useLocation();
  const { script, finalPrompt } = location.state || {};

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">생성된 대본이 없습니다.</h2>
        <p className="text-gray-600 mb-8">AI 대본 생성 페이지로 돌아가서 새로운 대본을 만들어보세요.</p>
        <Link
          to="/ai-script"
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          대본 생성하러 가기
        </Link>
      </div>
    );
  }

  // The script content is in script.content
  const scriptContent = script.content || script; // Fallback for safety

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          id="result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">AI 대본 생성 완료!</h2>
              <p className="text-gray-600">생성된 대본을 확인하고 자유롭게 활용해보세요.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
              <ScriptRenderer script={scriptContent} />
            </div>

            {finalPrompt && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">AI에게 전달된 최종 프롬프트</h3>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed bg-white p-4 rounded-lg border">
                  {finalPrompt}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(scriptContent);
                  toast.success('대본이 클립보드에 복사되었습니다!');
                }}
                className="flex items-center justify-center p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
              >
                <Copy className="w-5 h-5 mr-2" />
                복사
              </button>
              <button
                onClick={() => toast.error('저장 기능은 준비 중입니다.')}
                className="flex items-center justify-center p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
              >
                <Archive className="w-5 h-5 mr-2" />
                저장
              </button>
              <button
                onClick={() => toast.error('메모 기능은 준비 중입니다.')}
                className="flex items-center justify-center p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
              >
                <Edit3 className="w-5 h-5 mr-2" />
                메모
              </button>
               <Link
                  to="/ai-script"
                  className="flex items-center justify-center p-3 bg-purple-600 text-white rounded-xl font-medium transition-colors"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  새로 생성
                </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GeneralScript;
