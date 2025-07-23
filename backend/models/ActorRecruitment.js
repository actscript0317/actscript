const mongoose = require('mongoose');

const actorRecruitmentSchema = new mongoose.Schema({
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
    maxlength: 3000
  },
  
  // 모집 정보
  category: {
    type: String,
    enum: ['영화', '드라마', '연극', '뮤지컬', '광고', '웹드라마', '단편영화', '뮤직비디오', '기타'],
    required: true
  },
  projectType: {
    type: String,
    enum: ['상업', '독립', '학생', '아마추어'],
    required: true
  },
  
  // 역할 및 요구사항
  roles: [{
    name: String, // 역할명
    gender: {
      type: String,
      enum: ['남성', '여성', '무관']
    },
    ageRange: {
      min: Number,
      max: Number
    },
    description: String,
    requirements: [String]
  }],
  
  // 촬영/공연 정보
  shootingPeriod: {
    startDate: Date,
    endDate: Date,
    isFlexible: {
      type: Boolean,
      default: false
    }
  },
  location: {
    type: String,
    enum: ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '경북', '대구', '경남', '부산', '울산', '전북', '전남', '광주', '제주', '기타', '온라인'],
    required: true
  },
  detailedLocation: String,
  
  // 보상
  payment: {
    type: {
      type: String,
      enum: ['무료', '실비', '협의', '일정액'],
      required: true
    },
    amount: Number,
    details: String
  },
  
  // 지원 정보
  applicationDeadline: {
    type: Date,
    required: true
  },
  applicationMethod: {
    type: String,
    enum: ['이메일', '전화', '카카오톡', '인스타그램', '온라인폼', '직접만남'],
    required: true
  },
  contactInfo: {
    email: String,
    phone: String,
    kakao: String,
    instagram: String,
    other: String
  },
  
  // 추가 정보
  experience: {
    type: String,
    enum: ['무관', '신인 환영', '경력자 우대', '경력 필수'],
    default: '무관'
  },
  tags: [String],
  images: [{
    url: String,
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 상태 관리
  status: {
    type: String,
    enum: ['모집중', '마감', '완료', '취소'],
    default: '모집중'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  
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
actorRecruitmentSchema.index({ userId: 1 });
actorRecruitmentSchema.index({ category: 1, projectType: 1 });
actorRecruitmentSchema.index({ location: 1 });
actorRecruitmentSchema.index({ applicationDeadline: 1 });
actorRecruitmentSchema.index({ status: 1 });
actorRecruitmentSchema.index({ createdAt: -1 });
actorRecruitmentSchema.index({ views: -1 });
actorRecruitmentSchema.index({ isUrgent: -1, createdAt: -1 });

// 업데이트 시 updatedAt 자동 갱신
actorRecruitmentSchema.pre('save', function() {
  this.updatedAt = new Date();
  
  // 마감일이 지나면 자동으로 상태 변경
  if (this.applicationDeadline && this.applicationDeadline < new Date() && this.status === '모집중') {
    this.status = '마감';
  }
});

module.exports = mongoose.model('ActorRecruitment', actorRecruitmentSchema); 