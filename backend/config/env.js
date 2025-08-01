require('dotenv').config();

// 환경 변수 기본값 설정 (개발/테스트용)
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'actscript_jwt_secret_key_2025_secure_token';
}

if (!process.env.JWT_EXPIRE) {
  process.env.JWT_EXPIRE = '7d';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

if (!process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN = 'https://www.actpiece.com,https://actpiece.com,https://actscript-1.onrender.com';
}

if (!process.env.CLIENT_URL) {
  process.env.CLIENT_URL = 'https://www.actpiece.com';
}

// 나이스페이먼트 설정
if (!process.env.NICEPAY_CLIENT_KEY) {
  process.env.NICEPAY_CLIENT_KEY = 'R2_38961c9b2b494219adacb01cbd31f583';
}

if (!process.env.NICEPAY_SECRET_KEY) {
  process.env.NICEPAY_SECRET_KEY = '534fa658a8a24b4c8f8d7ded325cf569';
}

if (!process.env.NICEPAY_API_URL) {
  process.env.NICEPAY_API_URL = 'https://sandbox-api.nicepay.co.kr';
}


// 환경 변수 검증
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 필수 환경 변수가 누락되었습니다:', missingVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = {
  PORT: process.env.PORT || 10000,
  MONGODB_URI: process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV || 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://actscript-1.onrender.com',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CLIENT_URL: process.env.CLIENT_URL || 'https://actscript-1.onrender.com',
  
  // 나이스페이먼트 설정
  NICEPAY_CLIENT_KEY: process.env.NICEPAY_CLIENT_KEY,
  NICEPAY_SECRET_KEY: process.env.NICEPAY_SECRET_KEY,
  NICEPAY_API_URL: process.env.NICEPAY_API_URL
}; 