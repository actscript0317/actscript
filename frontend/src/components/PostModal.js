import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Eye, MessageCircle, Heart, Bookmark } from 'lucide-react';

const PostModal = ({ isOpen, onClose, post, categoryLabel }) => {
  if (!post) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {categoryLabel}
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {post.author}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(post.createdAt)}
                </span>
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {post.views}
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.comments}
                </span>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                
                {/* 추가 정보 */}
                {post.recruitmentField && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">모집 정보</h3>
                    <p><strong>모집분야:</strong> {post.recruitmentField}</p>
                    {post.applicationMethod && (
                      <p><strong>지원방법:</strong> {post.applicationMethod}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Heart className="w-5 h-5 mr-2" />
                    좋아요 {post.likes || 0}
                  </button>
                  <button className="flex items-center px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Bookmark className="w-5 h-5 mr-2" />
                    저장하기 {post.bookmarks || 0}
                  </button>
                </div>
                
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostModal; 