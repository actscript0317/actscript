const mongoose = require('mongoose');

// 임시 사용자를 위한 별도 스키마
const tempUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  emailVerificationCode: {
    type: String,
    required: true
  },
  emailVerificationCodeExpire: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // 1시간 후 자동 삭제
  }
});

// 인증 코드 생성 메소드
tempUserSchema.methods.generateEmailVerificationCode = function() {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.emailVerificationCode = require('crypto')
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');
  
  this.emailVerificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10분
  
  return verificationCode;
};

// 인증 코드 검증 메소드
tempUserSchema.methods.verifyEmailCode = function(inputCode) {
  if (!inputCode || !this.emailVerificationCode || !this.emailVerificationCodeExpire) {
    return false;
  }
  
  if (Date.now() > this.emailVerificationCodeExpire) {
    return false;
  }
  
  const hashedInputCode = require('crypto')
    .createHash('sha256')
    .update(inputCode)
    .digest('hex');
  
  return hashedInputCode === this.emailVerificationCode;
};

module.exports = mongoose.model('TempUser', tempUserSchema);