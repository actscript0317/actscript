const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// 디버그 로그 유틸리티
const debug = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 👤 User Model - ${message}`, {
    ...data,
    password: data.password ? '[HIDDEN]' : undefined
  });
};

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
    required: function() {
      // Google 로그인 사용자는 비밀번호가 필요하지 않음
      return !this.googleId;
    },
    minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다.'],
    validate: {
      validator: function(password) {
        // Google 로그인 사용자는 비밀번호 검증 스킵
        if (this.googleId && !password) return true;
        if (!password) return false;
        
        // 영문 대소문자, 숫자, 특수문자 중 3가지 이상 포함
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const criteriaCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChar].filter(Boolean).length;
        return criteriaCount >= 3;
      },
      message: '비밀번호는 영문 대소문자, 숫자, 특수문자 중 3가지 이상을 포함해야 합니다.'
    },
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
  // Google OAuth 관련 필드
  googleId: {
    type: String,
    unique: true,
    sparse: true // null 값도 허용하면서 unique 유지
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  // 로그인 시도 제한 관련 필드
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  // 비밀번호 재설정 관련 필드
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  // 이메일 인증 관련 필드
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpire: {
    type: Date,
    select: false
  },
  // 회원가입용 이메일 인증 코드
  emailVerificationCode: {
    type: String,
    select: false
  },
  emailVerificationCodeExpire: {
    type: Date,
    select: false
  },
  // 임시 사용자 데이터 (인증 완료 전)
  tempUserData: {
    type: Object,
    select: false
  }
}, {
  timestamps: true,
  collection: 'users'
});

// 데이터 유효성 검사 미들웨어
userSchema.pre('validate', function(next) {
  try {
    debug('유효성 검사 시작', {
      id: this._id,
      email: this.email,
      username: this.username,
      provider: this.provider,
      googleId: this.googleId
    });
    
    // 기본 필수 필드 확인
    if (!this.email || !this.username || !this.name) {
      const error = new Error('필수 필드가 누락되었습니다.');
      debug('유효성 검사 실패 - 필수 필드 누락', {
        hasEmail: !!this.email,
        hasUsername: !!this.username,
        hasName: !!this.name
      });
      return next(error);
    }
    
    // Google 로그인이 아닌 경우에만 비밀번호 필수
    if (!this.googleId && !this.password) {
      const error = new Error('일반 로그인의 경우 비밀번호는 필수입니다.');
      debug('유효성 검사 실패 - 비밀번호 누락 (일반 로그인)');
      return next(error);
    }
    
    debug('유효성 검사 통과');
    next();
  } catch (error) {
    debug('유효성 검사 중 에러', { error: error.message });
    next(error);
  }
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  try {
    debug('save 미들웨어 시작', {
      id: this._id,
      email: this.email,
      isNew: this.isNew,
      isModified: this.isModified('password'),
      modelState: this.modelName,
      collection: this.collection.name,
      mongooseConnection: mongoose.connection.readyState
    });
    
    // 비밀번호가 수정되지 않았으면 넘어감
    if (!this.isModified('password')) {
      debug('비밀번호 변경 없음, 해싱 스킵');
      return next();
    }
    
    // 비밀번호 해싱
    debug('비밀번호 해싱 시작');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    debug('비밀번호 해싱 완료');
    
    next();
  } catch (error) {
    debug('save 미들웨어 에러', { 
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    next(error);
  }
});

// save 이벤트 리스너
userSchema.post('save', function(doc, next) {
  try {
    debug('사용자 저장 완료', {
      id: doc._id,
      email: doc.email,
      username: doc.username,
      collection: doc.collection.name,
      modelState: doc.modelName
    });
    next();
  } catch (error) {
    debug('save 후처리 중 에러', { 
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    next(error);
  }
});

// 저장 실패 이벤트 리스너
userSchema.post('save', function(error, doc, next) {
  debug('save 에러 핸들러 실행', {
    errorName: error.name,
    errorCode: error.code,
    errorMessage: error.message,
    docId: doc ? doc._id : null
  });

  if (error.name === 'MongoServerError' && error.code === 11000) {
    debug('중복 키 에러 발생', {
      error: error.message,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    next(new Error('이미 존재하는 사용자명 또는 이메일입니다.'));
  } else {
    debug('기타 저장 에러', { 
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    next(error);
  }
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    debug('비밀번호 검증 시도');
    if (!this.password) {
      throw new Error('저장된 비밀번호가 없습니다.');
    }
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    debug('비밀번호 검증 완료', { isMatch });
    return isMatch;
  } catch (error) {
    debug('비밀번호 검증 에러', { error: error.message });
    throw error;
  }
};

// JWT 토큰 생성 메소드
userSchema.methods.getSignedJwtToken = function() {
  try {
    debug('JWT 토큰 생성 시작');
    if (!config.JWT_SECRET) {
      debug('JWT_SECRET 누락 경고');
      console.warn('JWT_SECRET not found in config, using fallback secret');
    }
    
    const token = jwt.sign(
      { 
        id: this._id,
        username: this.username,
        role: this.role 
      },
      config.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: config.JWT_EXPIRE || '7d' }
    );
    
    debug('JWT 토큰 생성 완료');
    return token;
  } catch (error) {
    debug('JWT 토큰 생성 에러', { error: error.message });
    throw error;
  }
};

// 사용자 정보를 안전하게 반환하는 메소드
userSchema.methods.toSafeObject = function() {
  try {
    debug('안전한 사용자 객체 생성');
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.loginAttempts;
    delete userObject.lockUntil;
    return userObject;
  } catch (error) {
    debug('안전한 사용자 객체 생성 에러', { error: error.message });
    throw error;
  }
};

// 로그인 시도 제한 관련 상수
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15분

// 가상 필드: 계정 잠금 여부
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 로그인 실패 시 호출하는 메서드
userSchema.methods.incLoginAttempts = function() {
  // 잠금 시간이 지났으면 초기화
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 최대 시도 횟수 도달 시 계정 잠금
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  
  return this.updateOne(updates);
};

// 로그인 성공 시 호출하는 메서드
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      lastLogin: new Date()
    }
  });
};

// 비밀번호 재설정 토큰 생성
userSchema.methods.getResetPasswordToken = function() {
  // 랜덤 토큰 생성
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  
  // 토큰 해싱해서 저장
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // 토큰 만료시간 설정 (10분)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// 이메일 인증 토큰 생성
userSchema.methods.getEmailVerificationToken = function() {
  // 랜덤 토큰 생성
  const verificationToken = require('crypto').randomBytes(20).toString('hex');
  
  // 토큰 해싱해서 저장
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // 토큰 만료시간 설정 (24시간)
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  
  return verificationToken;
};

// 회원가입용 이메일 인증 코드 생성 (6자리 숫자)
userSchema.methods.generateEmailVerificationCode = function() {
  // 6자리 랜덤 숫자 생성
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 코드를 해싱해서 저장
  this.emailVerificationCode = require('crypto')
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');
  
  // 코드 만료시간 설정 (10분)
  this.emailVerificationCodeExpire = Date.now() + 10 * 60 * 1000;
  
  return verificationCode;
};

// 인증 코드 검증
userSchema.methods.verifyEmailCode = function(inputCode) {
  if (!inputCode || !this.emailVerificationCode || !this.emailVerificationCodeExpire) {
    return false;
  }
  
  // 만료 시간 확인
  if (Date.now() > this.emailVerificationCodeExpire) {
    return false;
  }
  
  // 입력된 코드 해싱
  const hashedInputCode = require('crypto')
    .createHash('sha256')
    .update(inputCode)
    .digest('hex');
  
  // 저장된 코드와 비교
  return hashedInputCode === this.emailVerificationCode;
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
debug('User 모델 생성됨');

module.exports = User; 