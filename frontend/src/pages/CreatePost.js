import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  communityPostAPI, 
  actorProfileAPI, 
  actorRecruitmentAPI, 
  modelRecruitmentAPI 
} from '../services/api';

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
  
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const MAX_IMAGES = 7;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

  // 이미지 크기 조정 및 압축 함수
  const resizeImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 비율 계산
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // 압축된 이미지를 Blob으로 변환
        canvas.toBlob(resolve, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // 파일 유효성 검사
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return false;
    }

    return true;
  };

  // 이미지 업로드 처리
  const handleImageUpload = async (files) => {
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > MAX_IMAGES) {
      toast.error(`최대 ${MAX_IMAGES}장까지 업로드 가능합니다.`);
      return;
    }

    const validFiles = fileArray.filter(validateFile);
    
    if (validFiles.length === 0) return;

    try {
      const processedImages = await Promise.all(
        validFiles.map(async (file) => {
          const resizedBlob = await resizeImage(file);
          const url = URL.createObjectURL(resizedBlob);
          
          return {
            id: Date.now() + Math.random(),
            file: resizedBlob,
            url,
            name: file.name,
            size: resizedBlob.size
          };
        })
      );

      setImages(prev => [...prev, ...processedImages]);
      toast.success(`${processedImages.length}장의 이미지가 업로드되었습니다.`);
    } catch (error) {
      console.error('이미지 처리 실패:', error);
      toast.error('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  // 이미지 제거
  const removeImage = (imageId) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // URL 메모리 해제
      const removed = prev.find(img => img.id === imageId);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  };

  // 드래그 이벤트 핸들러
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleImageUpload(files);
  };

  // 파일 선택
  const handleFileSelect = (e) => {
    handleImageUpload(e.target.files);
    e.target.value = ''; // 같은 파일 재선택 가능하도록
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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

    setIsSubmitting(true);

    try {
      // FormData 객체 생성
      const submitData = new FormData();
      
      // 기본 데이터 추가
      submitData.append('title', formData.title);
      submitData.append('content', formData.content);
      submitData.append('category', formData.category);
      
      if (formData.tags) {
        submitData.append('tags', JSON.stringify(formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)));
      }

      // 이미지 파일 추가
      images.forEach((image, index) => {
        submitData.append('images', image.file);
      });

      let response;

      // 게시판 타입에 따라 다른 API 호출
      switch (boardType) {
        case 'actor-profile':
          // 배우 프로필 생성
          submitData.append('name', formData.recruitmentField || '배우');
          submitData.append('gender', '기타'); // enum: ['남성', '여성', '기타']
          submitData.append('experience', '신인'); // enum: ['신인', '1-2년', '3-5년', '5년 이상']
          submitData.append('location', '서울');
          response = await actorProfileAPI.create(submitData);
          break;

        case 'actor-recruitment':
          // 배우 모집공고 생성
          submitData.append('projectType', '상업');
          submitData.append('location', '서울');
          submitData.append('applicationDeadline', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30일 후
          submitData.append('applicationMethod', formData.applicationMethod || '이메일');
          submitData.append('payment', JSON.stringify({ type: '협의', details: '협의 후 결정' }));
          submitData.append('contactInfo', JSON.stringify({ email: 'contact@example.com' }));
          response = await actorRecruitmentAPI.create(submitData);
          break;

        case 'model-recruitment':
          // 모델 모집공고 생성
          submitData.append('modelType', '패션모델');
          submitData.append('location', '서울');
          submitData.append('applicationDeadline', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
          submitData.append('applicationMethod', formData.applicationMethod || '이메일');
          submitData.append('requirements', JSON.stringify({ gender: '무관', experience: '무관' }));
          submitData.append('payment', JSON.stringify({ type: '협의', details: '협의 후 결정' }));
          submitData.append('contactInfo', JSON.stringify({ email: 'contact@example.com' }));
          response = await modelRecruitmentAPI.create(submitData);
          break;

        default:
          // 일반 커뮤니티 게시글
          submitData.append('postType', '일반');
          response = await communityPostAPI.create(submitData);
          break;
      }

      if (response.data.success) {
        toast.success('게시글이 성공적으로 작성되었습니다!');
        navigate(getBackPath(boardType));
      } else {
        throw new Error(response.data.message || '게시글 작성에 실패했습니다.');
      }

    } catch (error) {
      console.error('게시글 작성 오류:', error);
      toast.error(error.response?.data?.message || error.message || '게시글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
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

            {/* 이미지 업로드 영역 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 업로드 (최대 {MAX_IMAGES}장)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {isDragging ? (
                  <div className="text-blue-600">
                    <Upload className="w-10 h-10 mx-auto mb-4" />
                    <p className="text-lg font-medium">이미지를 드롭하세요!</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <ImageIcon className="w-10 h-10 mx-auto mb-4" />
                    <p className="text-sm">
                      이미지를 드래그하여 업로드하거나 클릭하여 파일을 선택하세요
                    </p>
                    <p className="text-xs mt-2">
                      JPG, PNG, WEBP • 최대 5MB • {MAX_IMAGES}장까지
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 업로드된 이미지 미리보기 */}
            {images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업로드된 이미지 ({images.length}/{MAX_IMAGES})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map(image => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="이미지 제거"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                        {Math.round(image.size / 1024)}KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost; 