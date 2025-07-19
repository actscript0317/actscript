const mongoose = require('mongoose');

const scriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  characterCount: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  situation: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  emotions: [{
    type: String,
    required: true
  }],
  views: {
    type: Number,
    default: 0
  },
  // 확장된 필터링 필드들
  gender: {
    type: String,
    enum: ['전체', '여자', '남자', '혼성'],
    default: '전체'
  },
  mood: {
    type: String,
    enum: ['감정적인', '코믹한', '진지한', '로맨스', '스릴러', '판타지', 'SF', '시대극'],
    required: true
  },
  duration: {
    type: String,
    enum: ['30초 이하', '1분 이하', '1~3분', '3~5분', '5분 이상'],
    required: true
  },
  ageGroup: {
    type: String,
    enum: ['10대', '20대', '30대', '40대 이상'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['오디션', '연기 연습', '영상 제작', '수업/교육', '기타'],
    required: true
  },
  scriptType: {
    type: String,
    enum: ['상황극', '독백', '대화', '내레이션'],
    required: true
  },
  author: {
    name: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

// 텍스트 검색을 위한 인덱스 생성
scriptSchema.index({
  title: 'text',
  situation: 'text',
  content: 'text',
  emotions: 'text'
});

// 필터링을 위한 인덱스 추가
scriptSchema.index({ gender: 1 });
scriptSchema.index({ mood: 1 });
scriptSchema.index({ duration: 1 });
scriptSchema.index({ ageGroup: 1 });
scriptSchema.index({ purpose: 1 });
scriptSchema.index({ scriptType: 1 });
scriptSchema.index({ characterCount: 1 });

module.exports = mongoose.model('Script', scriptSchema); 