const mongoose = require('mongoose');

const actorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 기본 정보
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // 프로필 상세 정보
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: 15,
    max: 80
  },
  gender: {
    type: String,
    enum: ['남성', '여성', '기타'],
    required: true
  },
  height: {
    type: Number,
    min: 140,
    max: 220
  },
  weight: {
    type: Number,
    min: 30,
    max: 150
  },
  
  // 경력 정보
  experience: {
    type: String,
    enum: ['신인', '1-2년', '3-5년', '5년 이상'],
    required: true
  },
  education: {
    type: String,
    maxlength: 200
  },
  specialty: [{
    type: String,
    enum: ['연극', '영화', '드라마', '뮤지컬', '광고', '모델링', '성우', '기타']
  }],
  
  // 연락처 및 지역
  location: {
    type: String,
    enum: ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '경북', '대구', '경남', '부산', '울산', '전북', '전남', '광주', '제주', '기타'],
    required: true
  },
  contact: {
    phone: String,
    email: String,
    instagram: String,
    portfolio: String
  },
  
  // 이미지
  images: [{
    url: String,
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 메타 정보
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featuredUntil: Date, // 추천 프로필 만료일
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정
actorProfileSchema.index({ userId: 1 });
actorProfileSchema.index({ gender: 1, experience: 1 });
actorProfileSchema.index({ location: 1 });
actorProfileSchema.index({ createdAt: -1 });
actorProfileSchema.index({ views: -1 });

// 업데이트 시 updatedAt 자동 갱신
actorProfileSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('ActorProfile', actorProfileSchema); 