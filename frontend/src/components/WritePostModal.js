import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WritePostModal = ({ isOpen, onClose, onSubmit, categories, postType = 'general' }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    recruitmentField: '',
    applicationMethod: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.category) {
      toast.error('제목, 내용, 카테고리를 모두 입력해주세요.');
      return;
    }

    // 모집 글인 경우 추가 검증
    if ((postType === 'recruitment' || postType === 'model') && !formData.recruitmentField.trim()) {
      toast.error('모집분야를 입력해주세요.');
      return;
    }

    onSubmit(formData);
    setFormData({
      title: '',
      content: '',
      category: '',
      recruitmentField: '',
      applicationMethod: ''
    });
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* 헤더 */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">새 글 작성</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* 폼 내용 */}
              <div className="p-6 space-y-4">
                {/* 카테고리 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">카테고리를 선택하세요</option>
                    {categories.filter(cat => cat.value !== 'all').map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="제목을 입력하세요"
                    required
                  />
                </div>

                {/* 모집분야 (모집 글인 경우만) */}
                {(postType === 'recruitment' || postType === 'model') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      모집분야 *
                    </label>
                    <input
                      type="text"
                      name="recruitmentField"
                      value={formData.recruitmentField}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="예: 주연 배우, 모델 등"
                      required={postType === 'recruitment' || postType === 'model'}
                    />
                  </div>
                )}

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용 *
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="내용을 입력하세요"
                    required
                  />
                </div>

                {/* 지원방법 (모집 글인 경우만) */}
                {(postType === 'recruitment' || postType === 'model') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원방법
                    </label>
                    <input
                      type="text"
                      name="applicationMethod"
                      value={formData.applicationMethod}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="예: 이메일, 전화번호, 카카오톡 ID 등"
                    />
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    작성하기
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WritePostModal; 