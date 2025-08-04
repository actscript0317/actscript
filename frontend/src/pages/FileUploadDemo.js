import React, { useState } from 'react';
import { Upload, Image, Video, FileText, User, CheckCircle, AlertCircle } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import toast from 'react-hot-toast';

const FileUploadDemo = () => {
  const [uploadedFiles, setUploadedFiles] = useState({
    avatar: [],
    portfolio: [],
    'demo-reel': [],
    document: []
  });

  // 모의 사용자 ID (실제로는 인증된 사용자 ID를 사용)
  const mockUserId = 'demo_user_123';

  const handleUploadComplete = (type) => (files) => {
    console.log(`✅ ${type} 업로드 완료:`, files);
    
    const fileArray = Array.isArray(files) ? files : [files];
    setUploadedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...fileArray]
    }));
    
    toast.success(`${fileArray.length}개 파일이 성공적으로 업로드되었습니다!`);
  };

  const handleUploadError = (type) => (error, file) => {
    console.error(`❌ ${type} 업로드 실패:`, error);
    toast.error(`업로드 실패: ${error.message}`);
  };

  const clearUploadedFiles = (type) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: []
    }));
    toast.success(`${type} 파일 목록이 초기화되었습니다.`);
  };

  const getTypeInfo = (type) => {
    const types = {
      avatar: { icon: User, title: '프로필 사진', color: 'blue' },
      portfolio: { icon: Image, title: '포트폴리오', color: 'green' },
      'demo-reel': { icon: Video, title: '데모 릴', color: 'purple' },
      document: { icon: FileText, title: '문서', color: 'orange' }
    };
    return types[type];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600" />
            파일 업로드 데모
          </h1>
          <p className="text-gray-600 mt-2">
            Supabase Storage를 활용한 파일 업로드 기능을 테스트해보세요.
          </p>
        </div>

        {/* 파일 업로드 섹션들 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {['avatar', 'portfolio', 'demo-reel', 'document'].map(type => {
            const typeInfo = getTypeInfo(type);
            const IconComponent = typeInfo.icon;
            
            return (
              <div key={type} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <IconComponent className={`w-6 h-6 text-${typeInfo.color}-600`} />
                    {typeInfo.title}
                  </h2>
                  {uploadedFiles[type].length > 0 && (
                    <button
                      onClick={() => clearUploadedFiles(type)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      목록 초기화
                    </button>
                  )}
                </div>

                {/* 파일 업로더 */}
                <FileUploader
                  type={type}
                  userId={mockUserId}
                  onUploadComplete={handleUploadComplete(type)}
                  onUploadError={handleUploadError(type)}
                  multiple={type === 'portfolio' || type === 'document'}
                  className="mb-6"
                />

                {/* 업로드된 파일 통계 */}
                {uploadedFiles[type].length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-900">
                        업로드 완료: {uploadedFiles[type].length}개 파일
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadedFiles[type].map((file, index) => (
                        <div key={file.id || index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="flex-shrink-0">
                            {file.type?.startsWith('image/') ? (
                              <Image className="w-4 h-4 text-green-500" />
                            ) : file.type?.startsWith('video/') ? (
                              <Video className="w-4 h-4 text-purple-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                            </p>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 업로드 가이드 */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 업로드 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">프로필 사진</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• 지원 형식: JPEG, PNG, WebP, GIF</li>
                <li>• 최대 크기: 5MB</li>
                <li>• 단일 파일만 업로드 가능</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">포트폴리오</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• 지원 형식: JPEG, PNG, WebP</li>
                <li>• 최대 크기: 10MB</li>
                <li>• 여러 파일 업로드 가능</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">데모 릴</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• 지원 형식: MP4, WebM, MOV</li>
                <li>• 최대 크기: 100MB</li>
                <li>• 단일 파일만 업로드 가능</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">문서</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• 지원 형식: PDF, DOC, DOCX</li>
                <li>• 최대 크기: 20MB</li>
                <li>• 여러 파일 업로드 가능</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 실제 사용 예시 */}
        <div className="mt-8 bg-gray-800 text-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">💻 사용 예시</h3>
          <pre className="text-sm overflow-x-auto">
{`import FileUploader from '../components/FileUploader';

// 프로필 사진 업로드
<FileUploader
  type="avatar"
  userId={currentUser.id}
  onUploadComplete={(file) => {
    console.log('프로필 사진 업로드 완료:', file);
    // 사용자 프로필 업데이트
    updateUserProfile({ avatar: file.url });
  }}
  onUploadError={(error) => {
    console.error('업로드 실패:', error);
  }}
/>

// 포트폴리오 이미지 업로드 (다중)
<FileUploader
  type="portfolio"
  userId={currentUser.id}
  multiple={true}
  onUploadComplete={(files) => {
    console.log('포트폴리오 업로드 완료:', files);
    // 포트폴리오에 이미지 추가
    addPortfolioImages(files);
  }}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDemo;