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
  collection: 'users'
});

// 데이터 유효성 검사 미들웨어
userSchema.pre('validate', function(next) {
  try {
    console.log('Validating user data:', this._id || 'new user', this.email);
    
    if (!this.email || !this.password || !this.username || !this.name) {
      throw new Error('필수 필드가 누락되었습니다.');
    }
    
    next();
  } catch (error) {
    console.error('Validation error:', error);
    next(error);
  }
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  try {
    console.log('Starting pre-save hook for:', this._id || 'new user', this.email);
    
    // 비밀번호가 수정되지 않았으면 넘어감
    if (!this.isModified('password')) {
      console.log('Password not modified, skipping hash');
      return next();
    }
    
    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

// save 이벤트 리스너
userSchema.post('save', function(doc, next) {
  try {
    console.log('User saved successfully:', {
      id: doc._id,
      email: doc.email,
      username: doc.username
    });
    next();
  } catch (error) {
    console.error('Error in post-save hook:', error);
    next(error);
  }
});

// save 실패 이벤트 리스너
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('이미 존재하는 사용자명 또는 이메일입니다.'));
  } else {
    next(error);
  }
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    if (!this.password) {
      throw new Error('저장된 비밀번호가 없습니다.');
    }
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    return isMatch;
  } catch (error) {
    console.error('Password verification error:', error);
    throw error;
  }
};

// JWT 토큰 생성 메소드
userSchema.methods.getSignedJwtToken = function() {
  try {
    if (!config.JWT_SECRET) {
      console.warn('JWT_SECRET not found in config, using fallback secret');
    }
    
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
    console.error('JWT token generation error:', error);
    throw error;
  }
};

// 사용자 정보를 안전하게 반환하는 메소드
userSchema.methods.toSafeObject = function() {
  try {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
  } catch (error) {
    console.error('Error in toSafeObject:', error);
    throw error;
  }
};

// 인덱스 생성
userSchema.index({ username: 1 }, { 
  unique: true,
  background: true,
  name: 'username_unique'
});
userSchema.index({ email: 1 }, { 
  unique: true,
  background: true,
  name: 'email_unique'
});

// 모델 생성 전 캐시 삭제
if (mongoose.models.User) {
  delete mongoose.models.User;
}

// 모델 생성 및 내보내기
const User = mongoose.model('User', userSchema);

// 모델 생성 확인
console.log('User model created successfully');

module.exports = User; 