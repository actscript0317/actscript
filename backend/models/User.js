const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const cors = require('cors');

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
  timestamps: true
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  // 비밀번호가 수정되지 않았으면 넘어감
  if (!this.isModified('password')) return next();
  
  // 비밀번호 해싱
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 비밀번호 검증 메소드
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT 토큰 생성 메소드
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      role: this.role 
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

// 사용자 정보를 안전하게 반환하는 메소드
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// 사용자명과 이메일에 인덱스 생성
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema); 