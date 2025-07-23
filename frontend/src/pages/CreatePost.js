import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const CreatePost = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  
  // URL 파라미터에서 게시판 타입 가져오기
  const boardType = searchParams.get('board') || 'general';
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    recruitmentField: '',
    applicationMethod: '',
    tags: ''
  });

  // 게시판별 카테고리 설정
  const getCategoriesByBoard = (board) => {
    switch (board) {
      case 'actor-recruitment':
        return [
          { value: 'commercial-feature', label: '장편 상업영화' },
          { value: 'indie-feature', label: '장편 독립영화' },
          { value: 'short-film', label: '단편영화' },
          { value: 'ott-drama', label: 'OTT/TV 드라마' },
          { value: 'web-drama', label: '웹드라마' }
        ];
      case 'model-recruitment':
        return [
          { value: 'music-video', label: '뮤직비디오' },
          { value: 'advertisement', label: '광고/홍보' },
          { value: 'photoshoot', label: '화보촬영' },
          { value: 'youtube', label: '유튜브' },
          { value: 'etc', label: '기타' }
        ];
      case 'actor-info':
        return [
          { value: 'study-group', label: '스터디 그룹' },
          { value: 'practice-room', label: '연습실' },
          { value: 'acting-lesson', label: '연기레슨' },
          { value: 'profile-photo', label: '프로필 촬영' },
          { value: 'management', label: '매니지먼트' },
          { value: 'personal-shoot', label: '개인촬영' },
          { value: 'production-team', label: '제작팀' },
          { value: 'etc', label: '기타' }
        ];
      case 'actor-profile':
        return [
          { value: 'profile', label: '프로필 등록' },
          { value: 'introduction', label: '자기소개' },
          { value: 'experience', label: '경력 소개' },
          { value: 'collaboration', label: '협업 문의' }
        ];
      default:
        return [{ value: 'general', label: '일반' }];
    }
  };

  const categories = getCategoriesByBoard(boardType);
  const isRecruitmentBoard = boardType === 'actor-recruitment' || boardType === 'model-recruitment';

  // 게시판별 타이틀 설정
  const getBoardTitle = (board) => {
    switch (board) {
      case 'actor-recruitment': return '배우 모집';
      case 'model-recruitment': return '모델/출연자 모집';
      case 'actor-info': return '연기자 정보방';
      case 'actor-profile': return '배우 프로필';
      default: return '게시글';
    }
  };

  // 뒤로가기 경로 설정
  const getBackPath = (board) => {
    switch (board) {
      case 'actor-recruitment': return '/actor-recruitment';
      case 'model-recruitment': return '/model-recruitment';
      case 'actor-info': return '/actor-info';
      case 'actor-profile': return '/actor-profile';
      default: return '/';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim() || !formData.category) {
      toast.error('제목, 내용, 카테고리를 모두 입력해주세요.');
      return;
    }

    // 모집 글인 경우 추가 검증
    if (isRecruitmentBoard && !formData.recruitmentField.trim()) {
      toast.error('모집분야를 입력해주세요.');
      return;
    }

    // 게시글 저장 로직 (실제로는 API 호출)
    const newPost = {
      id: Date.now(),
      ...formData,
      author: '사용자', // 실제로는 로그인한 사용자 이름
      createdAt: new Date().toISOString(),
      views: 0,
      comments: 0,
      likes: 0,
      bookmarks: 0,
      boardType
    };

    console.log('새 게시글:', newPost);
    toast.success('게시글이 작성되었습니다!');
    
    // 해당 게시판으로 이동
    navigate(getBackPath(boardType));
  };

  const handleBack = () => {
    navigate(getBackPath(boardType));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">게시글을 작성하려면 먼저 로그인해주세요.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            뒤로 가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {getBoardTitle(boardType)} 글쓰기
          </h1>
        </div>

        {/* 글쓰기 폼 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">카테고리를 선택하세요</option>
                {categories.map(category => (
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            {/* 모집분야 (모집 글인 경우만) */}
            {isRecruitmentBoard && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  모집분야 *
                </label>
                <input
                  type="text"
                  name="recruitmentField"
                  value={formData.recruitmentField}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 주연 배우, 모델 등"
                  required={isRecruitmentBoard}
                />
              </div>
            )}

            {/* 본문 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                본문 내용 *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="내용을 입력하세요"
                required
              />
            </div>

            {/* 지원방법 (모집 글인 경우만) */}
            {isRecruitmentBoard && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  지원방법
                </label>
                <input
                  type="text"
                  name="applicationMethod"
                  value={formData.applicationMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 이메일, 전화번호, 카카오톡 ID 등"
                />
              </div>
            )}

            {/* 태그 (선택사항) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그 (선택사항)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="태그를 쉼표로 구분하여 입력하세요"
              />
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                작성하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost; 