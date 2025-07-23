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
  
  // 게시판 타입별 상수
  const isActorProfile = boardType === 'actor-profile';
  const isActorRecruitment = boardType === 'actor-recruitment'; 
  const isModelRecruitment = boardType === 'model-recruitment';
  const isCommunityPost = !isActorProfile && !isActorRecruitment && !isModelRecruitment;
  
  // enum 상수들
  const GENDER_OPTIONS = ['남성', '여성', '기타'];
  const EXPERIENCE_OPTIONS = ['신인', '1-2년', '3-5년', '5년 이상'];
  const ACTOR_EXPERIENCE_OPTIONS = ['무관', '신인 환영', '경력자 우대', '경력 필수'];
  const LOCATION_OPTIONS = ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '경북', '대구', '경남', '부산', '울산', '전북', '전남', '광주', '제주', '기타'];
  const SPECIALTY_OPTIONS = ['연극', '영화', '드라마', '뮤지컬', '광고', '모델링', '성우', '기타'];
  const PROJECT_TYPE_OPTIONS = ['상업', '독립', '학생', '아마추어'];
  const PAYMENT_TYPE_OPTIONS = ['무료', '실비', '협의', '일정액'];
  const MODEL_PAYMENT_OPTIONS = ['시급', '일급', '건당', '월급', '무료', '협의'];
  const APPLICATION_METHOD_OPTIONS = ['이메일', '전화', '카카오톡', '인스타그램', '온라인폼', '직접만남'];
  const MODEL_TYPE_OPTIONS = ['패션모델', '광고모델', '핸드모델', '피트모델', '헤어모델', '이벤트모델', '레이싱모델', '기타'];
  const BODY_TYPE_OPTIONS = ['마른형', '보통형', '근육형', '글래머형', '무관'];
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    recruitmentField: '',
    applicationMethod: '',
    tags: '',
    // 배우 프로필 전용 필드
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    experience: '',
    education: '',
    specialty: [],
    location: '',
    phone: '',
    email: '',
    instagram: '',
    portfolio: '',
    // 모집공고 전용 필드
    projectType: '',
    detailedLocation: '',
    paymentType: '',
    paymentAmount: '',
    paymentDetails: '',
    deadline: '',
    contactEmail: '',
    contactPhone: '',
    // 모델 모집 전용 필드
    modelType: '',
    bodyType: '',
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: ''
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
          { value: '영화', label: '영화' },
          { value: '드라마', label: '드라마' },
          { value: '연극', label: '연극' },
          { value: '뮤지컬', label: '뮤지컬' },
          { value: '광고', label: '광고' },
          { value: '웹드라마', label: '웹드라마' },
          { value: '단편영화', label: '단편영화' },
          { value: '뮤직비디오', label: '뮤직비디오' },
          { value: '기타', label: '기타' }
        ];
      case 'model-recruitment':
        return [
          { value: '화보촬영', label: '화보촬영' },
          { value: '광고촬영', label: '광고촬영' },
          { value: '패션쇼', label: '패션쇼' },
          { value: '이벤트', label: '이벤트' },
          { value: '행사진행', label: '행사진행' },
          { value: '방송출연', label: '방송출연' },
          { value: '유튜브', label: '유튜브' },
          { value: '라이브방송', label: '라이브방송' },
          { value: '기타', label: '기타' }
        ];
      case 'actor-info':
        return [
          { value: '오디션 정보', label: '오디션 정보' },
          { value: '연기 팁', label: '연기 팁' },
          { value: '업계 소식', label: '업계 소식' },
          { value: '스터디 모집', label: '스터디 모집' },
          { value: '장비 대여', label: '장비 대여' },
          { value: '질문/답변', label: '질문/답변' },
          { value: '후기/리뷰', label: '후기/리뷰' },
          { value: '네트워킹', label: '네트워킹' },
          { value: '교육/강의', label: '교육/강의' },
          { value: '자유게시판', label: '자유게시판' },
          { value: '기타', label: '기타' }
        ];
      case 'actor-profile':
        return [
          { value: 'profile', label: '프로필 등록' },
          { value: 'introduction', label: '자기소개' },
          { value: 'experience', label: '경력 소개' },
          { value: 'collaboration', label: '협업 문의' }
        ];
      default:
        return [
          { value: '자유', label: '자유게시판' },
          { value: '질문', label: '질문' },
          { value: '정보', label: '정보공유' },
          { value: '기타', label: '기타' }
        ];
    }
  };

  const categories = getCategoriesByBoard(boardType);

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

  // specialty 체크박스 핸들러
  const handleSpecialtyChange = (specialtyName) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(specialtyName)
        ? prev.specialty.filter(s => s !== specialtyName)
        : [...prev.specialty, specialtyName]
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

      // CSP 문제를 피하기 위해 data URL 사용
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
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
          
          // CSP 문제를 피하기 위해 data URL 사용
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(resizedBlob);
          });
          
          return {
            id: Date.now() + Math.random(),
            file: resizedBlob,
            url: dataUrl, // blob URL 대신 data URL 사용
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

    // 게시판별 최소 필수 검증 (임시로 완화)
    if (isActorProfile) {
      if (!formData.name.trim()) {
        // 기본값 설정
        formData.name = formData.name.trim() || '이름 미입력';
        formData.gender = formData.gender || '기타';
        formData.experience = formData.experience || '신인';
        formData.location = formData.location || '서울';
      }
    } else if (isActorRecruitment) {
      if (!formData.contactEmail && !formData.applicationMethod) {
        toast.error('연락처 이메일 또는 지원방법 중 하나는 필수입니다.');
        return;
      }
      // 기본값 설정
      formData.projectType = formData.projectType || '상업';
      formData.location = formData.location || '서울';
      formData.applicationMethod = formData.applicationMethod || '이메일';
      formData.paymentType = formData.paymentType || '협의';
      // deadline이 없으면 30일 후로 설정
      if (!formData.deadline) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        formData.deadline = futureDate.toISOString().split('T')[0];
      }
    } else if (isModelRecruitment) {
      if (!formData.contactEmail && !formData.applicationMethod) {
        toast.error('연락처 이메일 또는 지원방법 중 하나는 필수입니다.');
        return;
      }
      // 기본값 설정
      formData.modelType = formData.modelType || '패션모델';
      formData.location = formData.location || '서울';
      formData.applicationMethod = formData.applicationMethod || '이메일';
      formData.paymentType = formData.paymentType || '협의';
      // deadline이 없으면 30일 후로 설정
      if (!formData.deadline) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        formData.deadline = futureDate.toISOString().split('T')[0];
      }
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

      // 디버깅: 전송할 데이터 확인
      console.log('📤 전송할 데이터:', {
        boardType,
        formData: Object.fromEntries(
          Object.entries(formData).filter(([key, value]) => value !== '' && value !== null && value !== undefined)
        ),
        imageCount: images.length
      });

      let response;

      // 게시판 타입에 따라 다른 API 호출
      switch (boardType) {
        case 'actor-profile':
          // 배우 프로필 생성
          submitData.append('name', formData.name || '이름 미입력');
          submitData.append('gender', formData.gender || '기타');
          submitData.append('experience', formData.experience || '신인');
          submitData.append('location', formData.location || '서울');
          if (formData.age) submitData.append('age', formData.age);
          if (formData.height) submitData.append('height', formData.height);
          if (formData.weight) submitData.append('weight', formData.weight);
          if (formData.education) submitData.append('education', formData.education);
          if (formData.specialty.length > 0) {
            submitData.append('specialty', JSON.stringify(formData.specialty));
          }
          // 연락처 정보
          const contactInfo = {};
          if (formData.phone) contactInfo.phone = formData.phone;
          if (formData.email) contactInfo.email = formData.email;
          if (formData.instagram) contactInfo.instagram = formData.instagram;
          if (formData.portfolio) contactInfo.portfolio = formData.portfolio;
          if (Object.keys(contactInfo).length > 0) {
            submitData.append('contact', JSON.stringify(contactInfo));
          }
          response = await actorProfileAPI.create(submitData);
          break;

        case 'actor-recruitment':
          // 배우 모집공고 생성
          submitData.append('projectType', formData.projectType || '상업');
          submitData.append('location', formData.location || '서울');
          if (formData.detailedLocation) submitData.append('detailedLocation', formData.detailedLocation);
          
          // 지원 마감일 (사용자 입력 또는 30일 후)
          const deadline = formData.deadline ? new Date(formData.deadline).toISOString() 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          submitData.append('applicationDeadline', deadline);
          submitData.append('applicationMethod', formData.applicationMethod || '이메일');
          
          // 보상 정보
          const payment = {
            type: formData.paymentType || '협의',
            details: formData.paymentDetails || '협의 후 결정'
          };
          if (formData.paymentAmount) payment.amount = parseInt(formData.paymentAmount);
          submitData.append('payment', JSON.stringify(payment));
          
          // 연락처 정보
          const recruitmentContactInfo = {};
          if (formData.contactEmail) recruitmentContactInfo.email = formData.contactEmail;
          if (formData.contactPhone) recruitmentContactInfo.phone = formData.contactPhone;
          // 연락처가 하나도 없으면 기본 이메일 설정
          if (Object.keys(recruitmentContactInfo).length === 0) {
            recruitmentContactInfo.email = 'recruitment@example.com';
          }
          submitData.append('contactInfo', JSON.stringify(recruitmentContactInfo));
          response = await actorRecruitmentAPI.create(submitData);
          break;

        case 'model-recruitment':
          // 모델 모집공고 생성
          submitData.append('modelType', formData.modelType || '패션모델');
          submitData.append('location', formData.location || '서울');
          if (formData.detailedLocation) submitData.append('detailedLocation', formData.detailedLocation);
          
          // 지원 마감일
          const modelDeadline = formData.deadline ? new Date(formData.deadline).toISOString() 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          submitData.append('applicationDeadline', modelDeadline);
          submitData.append('applicationMethod', formData.applicationMethod || '이메일');
          
          // 모델 요구사항
          const requirements = {
            gender: formData.gender || '무관',
            experience: formData.experience || '무관'
          };
          if (formData.ageMin || formData.ageMax) {
            requirements.ageRange = {};
            if (formData.ageMin) requirements.ageRange.min = parseInt(formData.ageMin);
            if (formData.ageMax) requirements.ageRange.max = parseInt(formData.ageMax);
          }
          if (formData.heightMin || formData.heightMax) {
            requirements.heightRange = {};
            if (formData.heightMin) requirements.heightRange.min = parseInt(formData.heightMin);
            if (formData.heightMax) requirements.heightRange.max = parseInt(formData.heightMax);
          }
          if (formData.bodyType) requirements.bodyType = formData.bodyType;
          submitData.append('requirements', JSON.stringify(requirements));
          
          // 보상 정보
          const modelPayment = {
            type: formData.paymentType || '협의',
            details: formData.paymentDetails || '협의 후 결정'
          };
          if (formData.paymentAmount) modelPayment.amount = parseInt(formData.paymentAmount);
          submitData.append('payment', JSON.stringify(modelPayment));
          
          // 연락처 정보
          const modelContactInfo = {};
          if (formData.contactEmail) modelContactInfo.email = formData.contactEmail;
          if (formData.contactPhone) modelContactInfo.phone = formData.contactPhone;
          // 연락처가 하나도 없으면 기본 이메일 설정
          if (Object.keys(modelContactInfo).length === 0) {
            modelContactInfo.email = 'model@example.com';
          }
          submitData.append('contactInfo', JSON.stringify(modelContactInfo));
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
      console.error('❌ 게시글 작성 오류:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
        boardType: boardType
      });
      
      // 서버 응답 에러 메시지 표시
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(', ') ||
                          error.message || 
                          '게시글 작성 중 오류가 발생했습니다.';
      
      toast.error(`[${boardType}] ${errorMessage}`);
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

            {/* 배우 프로필 전용 필드들 */}
            {isActorProfile && (
              <>
                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>

                {/* 성별, 경력 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      성별 *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">성별 선택</option>
                      {GENDER_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      경력 *
                    </label>
                    <select
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">경력 선택</option>
                      {EXPERIENCE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 나이, 키, 몸무게 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      나이
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      min="15"
                      max="80"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="나이"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      키 (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      min="140"
                      max="220"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="키"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      몸무게 (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="30"
                      max="150"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="몸무게"
                    />
                  </div>
                </div>

                {/* 지역 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    활동 지역 *
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">지역 선택</option>
                    {LOCATION_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* 전문 분야 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전문 분야 (복수 선택 가능)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {SPECIALTY_OPTIONS.map(specialty => (
                      <label key={specialty} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.specialty.includes(specialty)}
                          onChange={() => handleSpecialtyChange(specialty)}
                          className="mr-2"
                        />
                        <span className="text-sm">{specialty}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 학력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학력
                  </label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="학력을 입력하세요"
                  />
                </div>

                {/* 연락처 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="이메일 주소"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      인스타그램
                    </label>
                    <input
                      type="text"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      포트폴리오 링크
                    </label>
                    <input
                      type="url"
                      name="portfolio"
                      value={formData.portfolio}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 배우 모집공고 전용 필드들 */}
            {isActorRecruitment && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      프로젝트 유형 *
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">프로젝트 유형 선택</option>
                      {PROJECT_TYPE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      촬영 지역 *
                    </label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">지역 선택</option>
                      {LOCATION_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 촬영 장소
                  </label>
                  <input
                    type="text"
                    name="detailedLocation"
                    value={formData.detailedLocation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 홍대 스튜디오, 강남구 일대"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원 마감일 *
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원 방법 *
                    </label>
                    <select
                      name="applicationMethod"
                      value={formData.applicationMethod}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">지원 방법 선택</option>
                      {APPLICATION_METHOD_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 유형 *
                    </label>
                    <select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">보수 유형 선택</option>
                      {PAYMENT_TYPE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 금액
                    </label>
                    <input
                      type="number"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="금액 (원)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 상세
                    </label>
                    <input
                      type="text"
                      name="paymentDetails"
                      value={formData.paymentDetails}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: 식비 별도 제공"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 이메일 *
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="연락받을 이메일"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 전화번호
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 모델 모집공고 전용 필드들 */}
            {isModelRecruitment && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      모델 유형 *
                    </label>
                    <select
                      name="modelType"
                      value={formData.modelType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">모델 유형 선택</option>
                      {MODEL_TYPE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      촬영 지역 *
                    </label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">지역 선택</option>
                      {LOCATION_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 촬영 장소
                  </label>
                  <input
                    type="text"
                    name="detailedLocation"
                    value={formData.detailedLocation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 강남구 스튜디오, 삼성동 일대"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      성별 요구사항
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">성별 무관</option>
                      {GENDER_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      경력 요구사항
                    </label>
                    <select
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">경력 무관</option>
                      {ACTOR_EXPERIENCE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      체형 요구사항
                    </label>
                    <select
                      name="bodyType"
                      value={formData.bodyType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">체형 무관</option>
                      {BODY_TYPE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      나이 요구사항
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        name="ageMin"
                        value={formData.ageMin}
                        onChange={handleChange}
                        min="15"
                        max="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="최소"
                      />
                      <span className="self-center">~</span>
                      <input
                        type="number"
                        name="ageMax"
                        value={formData.ageMax}
                        onChange={handleChange}
                        min="15"
                        max="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="최대"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      키 요구사항 (cm)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        name="heightMin"
                        value={formData.heightMin}
                        onChange={handleChange}
                        min="140"
                        max="220"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="최소"
                      />
                      <span className="self-center">~</span>
                      <input
                        type="number"
                        name="heightMax"
                        value={formData.heightMax}
                        onChange={handleChange}
                        min="140"
                        max="220"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="최대"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원 마감일 *
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원 방법 *
                    </label>
                    <select
                      name="applicationMethod"
                      value={formData.applicationMethod}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">지원 방법 선택</option>
                      {APPLICATION_METHOD_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 유형 *
                    </label>
                    <select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">보수 유형 선택</option>
                      {MODEL_PAYMENT_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 금액
                    </label>
                    <input
                      type="number"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="금액 (원)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보수 상세
                    </label>
                    <input
                      type="text"
                      name="paymentDetails"
                      value={formData.paymentDetails}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: 교통비 별도"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 이메일 *
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="연락받을 이메일"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 전화번호
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>
              </>
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
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={() => {
                    // 테스트용 기본 데이터 설정
                    setFormData(prev => ({
                      ...prev,
                      title: `테스트 게시글 ${Date.now()}`,
                      content: '테스트용 내용입니다.',
                      category: categories[0]?.value || '기타',
                      ...(isActorProfile && {
                        name: '테스트 배우',
                        gender: '기타',
                        experience: '신인',
                        location: '서울'
                      }),
                      ...(isActorRecruitment && {
                        projectType: '상업',
                        location: '서울',
                        applicationMethod: '이메일',
                        paymentType: '협의',
                        contactEmail: 'test@example.com'
                      }),
                      ...(isModelRecruitment && {
                        modelType: '패션모델',
                        location: '서울',
                        applicationMethod: '이메일',
                        paymentType: '협의',
                        contactEmail: 'test@example.com'
                      }),
                      ...(isCommunityPost && {
                        postType: '일반'
                      })
                    }));
                    toast.success('테스트 데이터가 설정되었습니다!');
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  🧪 테스트 데이터
                </button>
              )}
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