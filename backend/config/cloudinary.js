const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 배우 프로필용 Cloudinary Storage 설정
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'actscript/profiles', // Cloudinary 폴더명
    format: async (req, file) => {
      // 원본 포맷 유지 또는 jpg로 변환
      const format = file.mimetype.split('/')[1];
      return ['jpeg', 'jpg', 'png', 'webp'].includes(format) ? format : 'jpg';
    },
    public_id: (req, file) => {
      // 파일명 생성: profile-timestamp-random
      return `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    },
    transformation: [
      {
        width: 800,
        height: 1000,
        crop: 'limit', // 비율 유지하며 최대 크기 제한
        quality: 'auto:good', // 자동 품질 최적화
        fetch_format: 'auto' // 브라우저에 최적화된 포맷 자동 선택
      }
    ]
  },
});

// 커뮤니티 게시글용 Cloudinary Storage 설정
const communityStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'actscript/community',
    format: async (req, file) => {
      const format = file.mimetype.split('/')[1];
      return ['jpeg', 'jpg', 'png', 'webp'].includes(format) ? format : 'jpg';
    },
    public_id: (req, file) => {
      return `community-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    },
    transformation: [
      {
        width: 1200,
        height: 800,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ]
  },
});

// 모집공고용 Cloudinary Storage 설정
const recruitmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'actscript/recruitments',
    format: async (req, file) => {
      const format = file.mimetype.split('/')[1];
      return ['jpeg', 'jpg', 'png', 'webp'].includes(format) ? format : 'jpg';
    },
    public_id: (req, file) => {
      return `recruitment-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    },
    transformation: [
      {
        width: 1200,
        height: 800,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ]
  },
});

// Multer 업로드 설정
const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

const communityUpload = multer({
  storage: communityStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

const recruitmentUpload = multer({
  storage: recruitmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 이미지 삭제 함수
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ [Cloudinary] 이미지 삭제 결과:', result);
    return result;
  } catch (error) {
    console.error('❌ [Cloudinary] 이미지 삭제 실패:', error);
    throw error;
  }
};

// 이미지 URL에서 public_id 추출 함수
const getPublicIdFromUrl = (url) => {
  try {
    // Cloudinary URL에서 public_id 추출
    // 예: https://res.cloudinary.com/cloud/image/upload/v1234567890/actscript/profiles/profile-123.jpg
    const matches = url.match(/\/([^\/]+\/[^\/]+)\.([a-zA-Z]{3,4})$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('❌ [Cloudinary] Public ID 추출 실패:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  profileUpload,
  communityUpload,
  recruitmentUpload,
  deleteImage,
  getPublicIdFromUrl
};