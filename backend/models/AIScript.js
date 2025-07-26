const mongoose = require('mongoose');

const aiScriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  // AI 생성 시 사용된 파라미터들
  characterCount: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  emotions: [{
    type: String
  }],
  length: {
    type: String,
    required: true
  },
  gender: {
    type: String
  },
  situation: {
    type: String
  },
  style: {
    type: String
  },
  // 사용자 정보
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // AI 생성 메타데이터
  metadata: {
    model: String,
    generateTime: Date,
    promptTokens: Number,
    completionTokens: Number
  },
  // 저장 여부 (대본함에 저장했는지)
  isSaved: {
    type: Boolean,
    default: false
  },
  savedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 사용자별 스크립트 조회를 위한 인덱스
aiScriptSchema.index({ userId: 1, createdAt: -1 });
aiScriptSchema.index({ userId: 1, isSaved: 1 });

// 텍스트 검색을 위한 인덱스
aiScriptSchema.index({
  title: 'text',
  content: 'text',
  genre: 'text',
  emotions: 'text'
});

module.exports = mongoose.model('AIScript', aiScriptSchema); 