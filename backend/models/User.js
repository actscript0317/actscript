const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '사용자명은 필수입니다.'],
    unique: true,
    trim: true,
    minlength: [3, '사용자명은 최소 3자 이상이어야 합니다.'],
    maxlength: [20, '사용자명은 20자를 초과할 수 없습니다.']
  },
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      '올바른 이메일 형식을 입력해주세요.'
    ]
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다.'],
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.'],
    select: false // 기본적으로 비밀번호는 조회 시 제외
  },
  name: {
    type: String,
    required: [true, '이름은 필수입니다.'],
    trim: true,
    maxlength: [50, '이름은 50자를 초과할 수 없습니다.']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users' // 컬렉션 이름 명시적 지정
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  try {
    console.log('Pre save hook 실행:', this._id, this.email);
    
    // 비밀번호가 수정되지 않았으면 넘어감
    if (!this.isModified('password')) {
      console.log('비밀번호 변경 없음, pre save hook 스킵');
      return next();
    }
    
    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('비밀번호 해싱 완료');
    
    next();
  } catch (error) {
    console.error('Pre save hook 에러:', error);
    next(error);
  }
});

// save 이벤트 리스너 추가
userSchema.post('save', function(doc) {
  console.log('User saved:', doc._id, doc.email);
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('비밀번호 검증 에러:', error);
    throw error;
  }
};

// JWT 토큰 생성 메소드
userSchema.methods.getSignedJwtToken = function() {
  try {
    return jwt.sign(
      { 
        id: this._id,
        username: this.username,
        role: this.role 
      },
      config.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: config.JWT_EXPIRE || '7d' }
    );
  } catch (error) {
    console.error('JWT 토큰 생성 에러:', error);
    throw error;
  }
};

// 사용자 정보를 안전하게 반환하는 메소드
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// 사용자명과 이메일에 인덱스 생성
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// 모델 생성 전 캐시 삭제
if (mongoose.models.User) {
  delete mongoose.models.User;
}

// 모델 생성 및 내보내기
const User = mongoose.model('User', userSchema);
module.exports = User; 