const mongoose = require('mongoose');

const modelRecruitmentSchema = new mongoose.Schema({
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
    enum: ['화보촬영', '광고촬영', '패션쇼', '이벤트', '행사진행', '방송출연', '유튜브', '라이브방송', '기타'],
    required: true
  },
  modelType: {
    type: String,
    enum: ['패션모델', '광고모델', '핸드모델', '피트모델', '헤어모델', '이벤트모델', '레이싱모델', '기타'],
    required: true
  },
  
  // 모델 요구사항
  requirements: {
    gender: {
      type: String,
      enum: ['남성', '여성', '무관'],
      required: true
    },
    ageRange: {
      min: {
        type: Number,
        min: 15,
        max: 80
      },
      max: {
        type: Number,
        min: 15,
        max: 80
      }
    },
    heightRange: {
      min: Number,
      max: Number
    },
    bodyType: {
      type: String,
      enum: ['마른형', '보통형', '근육형', '글래머형', '무관']
    },
    experience: {
      type: String,
      enum: ['무관', '신인 환영', '경력자 우대', '경력 필수'],
      default: '무관'
    },
    specialRequirements: [String] // 특별 요구사항
  },
  
  // 촬영/행사 정보
  workPeriod: {
    startDate: Date,
    endDate: Date,
    duration: String, // 예: "3시간", "1일", "1주일"
    isFlexible: {
      type: Boolean,
      default: false
    }
  },
  location: {
    type: String,
    enum: ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '경북', '대구', '경남', '부산', '울산', '전북', '전남', '광주', '제주', '기타'],
    required: true
  },
  detailedLocation: String,
  
  // 보수 정보
  payment: {
    type: {
      type: String,
      enum: ['시급', '일급', '건당', '월급', '무료', '협의'],
      required: true
    },
    amount: Number,
    currency: {
      type: String,
      default: 'KRW'
    },
    additionalBenefits: [String], // 추가 혜택 (식사제공, 교통비, 숙박 등)
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
    company: String, // 회사명
    other: String
  },
  
  // 포트폴리오 요구사항
  portfolioRequirements: {
    photos: {
      type: Boolean,
      default: true
    },
    videos: {
      type: Boolean,
      default: false
    },
    measurements: {
      type: Boolean,
      default: false
    },
    resume: {
      type: Boolean,
      default: false
    }
  },
  
  // 추가 정보
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
  isPremium: {
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
modelRecruitmentSchema.index({ userId: 1 });
modelRecruitmentSchema.index({ category: 1, modelType: 1 });
modelRecruitmentSchema.index({ 'requirements.gender': 1 });
modelRecruitmentSchema.index({ location: 1 });
modelRecruitmentSchema.index({ 'payment.type': 1, 'payment.amount': -1 });
modelRecruitmentSchema.index({ applicationDeadline: 1 });
modelRecruitmentSchema.index({ status: 1 });
modelRecruitmentSchema.index({ createdAt: -1 });
modelRecruitmentSchema.index({ views: -1 });
modelRecruitmentSchema.index({ isUrgent: -1, isPremium: -1, createdAt: -1 });

// 업데이트 시 updatedAt 자동 갱신
modelRecruitmentSchema.pre('save', function() {
  this.updatedAt = new Date();
  
  // 마감일이 지나면 자동으로 상태 변경
  if (this.applicationDeadline && this.applicationDeadline < new Date() && this.status === '모집중') {
    this.status = '마감';
  }
});

module.exports = mongoose.model('ModelRecruitment', modelRecruitmentSchema); 