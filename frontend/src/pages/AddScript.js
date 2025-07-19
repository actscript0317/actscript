import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { scriptAPI, emotionAPI } from '../services/api';

const AddScript = () => {
  const navigate = useNavigate();
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    characterCount: 1,
    situation: '',
    content: '',
    emotions: []
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchEmotions();
  }, []);

  const fetchEmotions = async () => {
    try {
      const response = await emotionAPI.getAll();
      setEmotions(response.data);
    } catch (error) {
      console.error('감정 목록 조회 실패:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEmotionChange = (emotionName) => {
    setFormData(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotionName)
        ? prev.emotions.filter(e => e !== emotionName)
        : [...prev.emotions, emotionName]
    }));
    
    // 감정 에러 메시지 제거
    if (errors.emotions) {
      setErrors(prev => ({
        ...prev,
        emotions: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    }

    if (!formData.situation.trim()) {
      newErrors.situation = '상황 설명을 입력해주세요.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '대본 내용을 입력해주세요.';
    }

    if (formData.emotions.length === 0) {
      newErrors.emotions = '최소 1개의 감정을 선택해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');
      setSubmitSuccess('');

      await scriptAPI.create({
        ...formData,
        characterCount: parseInt(formData.characterCount)
      });

      setSubmitSuccess('대본이 성공적으로 등록되었습니다!');
      
      // 2초 후 목록 페이지로 이동
      setTimeout(() => {
        navigate('/scripts');
      }, 2000);

    } catch (error) {
      console.error('대본 등록 실패:', error);
      setSubmitError(
        error.response?.data?.message || '대본 등록 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      characterCount: 1,
      situation: '',
      content: '',
      emotions: []
    });
    setErrors({});
    setSubmitError('');
    setSubmitSuccess('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/scripts')}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </button>
          
          <h1 className="text-3xl font-bold text-gray-800">새 대본 등록</h1>
          <p className="text-gray-600 mt-2">새로운 연기 대본을 등록해보세요.</p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 성공/에러 메시지 */}
          {submitSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700">{submitSuccess}</p>
            </div>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="대본의 제목을 입력하세요"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* 등장인물 수 */}
            <div>
              <label htmlFor="characterCount" className="block text-sm font-medium text-gray-700 mb-2">
                등장인물 수
              </label>
              <select
                id="characterCount"
                name="characterCount"
                value={formData.characterCount}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                  <option key={count} value={count}>
                    {count}명
                  </option>
                ))}
              </select>
            </div>

            {/* 감정 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                감정 태그 <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-500 mb-3">대본에 해당하는 감정을 선택하세요 (복수 선택 가능)</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {emotions.map((emotion) => (
                  <label
                    key={emotion._id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition duration-200 ${
                      formData.emotions.includes(emotion.name)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.emotions.includes(emotion.name)}
                      onChange={() => handleEmotionChange(emotion.name)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">{emotion.name}</span>
                  </label>
                ))}
              </div>
              
              {errors.emotions && (
                <p className="text-red-500 text-sm mt-2">{errors.emotions}</p>
              )}
            </div>

            {/* 상황 설명 */}
            <div>
              <label htmlFor="situation" className="block text-sm font-medium text-gray-700 mb-2">
                상황 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="situation"
                name="situation"
                value={formData.situation}
                onChange={handleInputChange}
                rows="4"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.situation ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="대본의 배경과 상황을 설명해주세요"
              />
              {errors.situation && (
                <p className="text-red-500 text-sm mt-1">{errors.situation}</p>
              )}
            </div>

            {/* 대본 내용 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                대본 내용 <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-500 mb-3">
                대사는 다음과 같은 형식으로 작성해주세요:<br />
                캐릭터1: 대사 내용<br />
                캐릭터2: 대사 내용
              </p>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="12"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono ${
                  errors.content ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="대본 내용을 입력하세요"
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content}</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
                disabled={loading}
              >
                초기화
              </button>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/scripts')}
                  className="btn-secondary"
                  disabled={loading}
                >
                  취소
                </button>
                
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      등록 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      대본 등록
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddScript; 