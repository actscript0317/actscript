import React, { useState, useRef } from 'react';
import { Upload, X, Image, Video, FileText, User, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { storageHelpers } from '../utils/supabase';
import toast from 'react-hot-toast';

const FileUploader = ({ 
  type = 'avatar', // 'avatar', 'portfolio', 'demo-reel', 'document'
  userId,
  onUploadComplete,
  onUploadError,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  multiple = false,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // 파일 타입별 설정
  const getTypeConfig = (fileType) => {
    const configs = {
      avatar: {
        bucket: 'avatars',
        maxSize: 5 * 1024 * 1024, // 5MB
        accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        icon: User,
        title: '프로필 사진',
        description: '프로필 사진을 업로드하세요 (최대 5MB)'
      },
      portfolio: {
        bucket: 'portfolio',
        maxSize: 10 * 1024 * 1024, // 10MB
        accept: ['image/jpeg', 'image/png', 'image/webp'],
        icon: Image,
        title: '포트폴리오 이미지',
        description: '포트폴리오 이미지를 업로드하세요 (최대 10MB)'
      },
      'demo-reel': {
        bucket: 'demo-reels',
        maxSize: 100 * 1024 * 1024, // 100MB
        accept: ['video/mp4', 'video/webm', 'video/mov'],
        icon: Video,
        title: '데모 릴',
        description: '데모 릴 영상을 업로드하세요 (최대 100MB)'
      },
      document: {
        bucket: 'documents',
        maxSize: 20 * 1024 * 1024, // 20MB
        accept: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        icon: FileText,
        title: '문서',
        description: '문서를 업로드하세요 (최대 20MB)'
      }
    };
    return configs[fileType] || configs.avatar;
  };

  const config = getTypeConfig(type);
  const IconComponent = config.icon;

  // 파일 유효성 검사
  const validateFile = (file) => {
    // 파일 크기 검사
    if (file.size > config.maxSize) {
      const sizeMB = (config.maxSize / (1024 * 1024)).toFixed(1);
      throw new Error(`파일 크기는 ${sizeMB}MB 이하여야 합니다.`);
    }

    // 파일 타입 검사
    if (!config.accept.includes(file.type)) {
      throw new Error(`지원하지 않는 파일 형식입니다. (지원: ${config.accept.join(', ')})`);
    }

    return true;
  };

  // 파일 업로드 처리
  const handleFileUpload = async (files) => {
    if (!userId) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const fileArray = Array.from(files);
    
    if (!multiple && fileArray.length > 1) {
      toast.error('하나의 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const results = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        try {
          // 파일 유효성 검사
          validateFile(file);

          // 파일명 생성 (사용자ID/타임스탬프_원본파일명)
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

          console.log(`📤 파일 업로드 시작: ${fileName}`);

          // Supabase Storage에 업로드
          const { data, error } = await storageHelpers.upload(
            config.bucket,
            fileName,
            file,
            {
              cacheControl: '3600',
              upsert: false
            }
          );

          if (error) {
            throw error;
          }

          // 공개 URL 가져오기
          const { data: { publicUrl } } = storageHelpers.getPublicUrl(config.bucket, fileName);

          const fileInfo = {
            id: Date.now() + i,
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrl,
            path: fileName,
            bucket: config.bucket
          };

          results.push(fileInfo);
          
          // 진행률 업데이트
          setUploadProgress(((i + 1) / fileArray.length) * 100);

          console.log(`✅ 파일 업로드 완료: ${fileName}`);
          toast.success(`${file.name} 업로드 완료!`);

        } catch (fileError) {
          console.error(`❌ 파일 업로드 실패: ${file.name}`, fileError);
          toast.error(`${file.name}: ${fileError.message}`);
          
          if (onUploadError) {
            onUploadError(fileError, file);
          }
        }
      }

      // 업로드된 파일들을 상태에 추가
      if (results.length > 0) {
        setUploadedFiles(prev => multiple ? [...prev, ...results] : results);
        
        if (onUploadComplete) {
          onUploadComplete(multiple ? results : results[0]);
        }
      }

    } catch (error) {
      console.error('❌ 업로드 중 전체 오류:', error);
      toast.error('업로드 중 오류가 발생했습니다.');
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 삭제
  const handleFileDelete = async (fileInfo) => {
    try {
      console.log(`🗑️ 파일 삭제 시작: ${fileInfo.path}`);
      
      const { error } = await storageHelpers.remove(fileInfo.bucket, [fileInfo.path]);
      
      if (error) {
        throw error;
      }

      // 상태에서 제거
      setUploadedFiles(prev => prev.filter(f => f.id !== fileInfo.id));
      
      console.log(`✅ 파일 삭제 완료: ${fileInfo.name}`);
      toast.success(`${fileInfo.name} 삭제 완료!`);

    } catch (error) {
      console.error('❌ 파일 삭제 실패:', error);
      toast.error(`파일 삭제에 실패했습니다: ${error.message}`);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 업로드 영역 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : uploading 
              ? 'border-gray-300 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={config.accept.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-4">
            <Loader className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-900">업로드 중...</p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <IconComponent className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{config.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                또는 파일을 드래그해서 업로드하세요
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              파일 선택
            </button>
          </div>
        )}
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">업로드된 파일</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : file.type.startsWith('video/') ? (
                      <Video className="w-10 h-10 text-purple-500" />
                    ) : (
                      <FileText className="w-10 h-10 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileDelete(file);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파일 타입 및 크기 제한 안내 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• 지원 형식: {config.accept.join(', ')}</p>
        <p>• 최대 크기: {(config.maxSize / (1024 * 1024)).toFixed(1)}MB</p>
        {multiple && <p>• 여러 파일 업로드 가능</p>}
      </div>
    </div>
  );
};

export default FileUploader;