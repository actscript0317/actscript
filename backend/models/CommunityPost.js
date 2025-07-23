const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
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
    maxlength: 5000
  },
  
  // 카테고리 및 분류
  category: {
    type: String,
    enum: [
      '오디션 정보', 
      '연기 팁', 
      '업계 소식', 
      '스터디 모집', 
      '장비 대여', 
      '질문/답변', 
      '후기/리뷰',
      '네트워킹',
      '교육/강의',
      '자유게시판',
      '기타'
    ],
    required: true
  },
  subcategory: {
    type: String,
    maxlength: 50
  },
  
  // 게시글 속성
  postType: {
    type: String,
    enum: ['일반', '공지', '이벤트', '급구', '추천'],
    default: '일반'
  },
  tags: [{
    type: String,
    maxlength: 20
  }],
  
  // 지역 정보 (지역별 정보인 경우)
  location: {
    type: String,
    enum: ['전국', '서울', '경기', '인천', '강원', '충북', '충남', '대전', '경북', '대구', '경남', '부산', '울산', '전북', '전남', '광주', '제주', '기타']
  },
  
  // 미디어
  images: [{
    url: String,
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    url: String,
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 상호작용
  views: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  
  // 게시글 상태
  status: {
    type: String,
    enum: ['활성', '숨김', '삭제', '신고'],
    default: '활성'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isHot: {
    type: Boolean,
    default: false
  },
  
  // 모집 관련 (스터디 모집 등)
  recruitment: {
    isRecruiting: {
      type: Boolean,
      default: false
    },
    maxParticipants: Number,
    currentParticipants: {
      type: Number,
      default: 0
    },
    deadline: Date,
    contactMethod: {
      type: String,
      enum: ['댓글', '쪽지', '이메일', '전화', '카카오톡']
    }
  },
  
  // 이벤트 관련
  event: {
    isEvent: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    venue: String,
    fee: Number,
    maxAttendees: Number
  },
  
  // SEO 및 검색
  keywords: [String],
  summary: {
    type: String,
    maxlength: 200
  },
  
  // 관리자 정보
  moderationStatus: {
    type: String,
    enum: ['대기', '승인', '거절', '검토중'],
    default: '승인'
  },
  moderatorNotes: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // 통계용
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정
communityPostSchema.index({ userId: 1 });
communityPostSchema.index({ category: 1, subcategory: 1 });
communityPostSchema.index({ postType: 1 });
communityPostSchema.index({ location: 1 });
communityPostSchema.index({ status: 1 });
communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ views: -1 });
communityPostSchema.index({ likeCount: -1 });
communityPostSchema.index({ lastActivityAt: -1 });
communityPostSchema.index({ isPinned: -1, isHot: -1, createdAt: -1 });
communityPostSchema.index({ tags: 1 });
communityPostSchema.index({ keywords: 1 });

// 텍스트 인덱스 (검색용)
communityPostSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
  keywords: 'text'
});

// 업데이트 시 updatedAt 자동 갱신
communityPostSchema.pre('save', function() {
  this.updatedAt = new Date();
  
  // 활동이 있을 때 lastActivityAt 업데이트
  if (this.isModified('likeCount') || this.isModified('commentCount') || this.isModified('views')) {
    this.lastActivityAt = new Date();
  }
  
  // Hot 게시글 자동 판정 (좋아요 + 댓글 + 조회수 기준)
  const hotScore = (this.likeCount * 3) + (this.commentCount * 2) + (this.views * 0.1);
  this.isHot = hotScore > 100; // 임계값은 조정 가능
});

// 가상 필드: 인기도 점수
communityPostSchema.virtual('popularityScore').get(function() {
  const ageInDays = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-ageInDays / 7); // 7일 후 점수가 절반
  return ((this.likeCount * 3) + (this.commentCount * 2) + (this.views * 0.1)) * decayFactor;
});

module.exports = mongoose.model('CommunityPost', communityPostSchema); 