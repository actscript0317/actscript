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
  process.env.CORS_ORIGIN = 'https://actscript-frontend.onrender.com,https://www.actpiece.com,https://actpiece.com,http://localhost:3000';
}

if (!process.env.CLIENT_URL) {
  process.env.CLIENT_URL = 'https://actscript-frontend.onrender.com';
}

// 나이스페이먼트 설정 (테스트용 키)
if (!process.env.NICEPAY_CLIENT_KEY) {
  process.env.NICEPAY_CLIENT_KEY = 'R2_38961c9b2b494219adacb01cbd31f583';
}

if (!process.env.NICEPAY_SECRET_KEY) {
  process.env.NICEPAY_SECRET_KEY = '534fa658a8a24b4c8f8d7ded325cf569';
}

if (!process.env.NICEPAY_API_URL) {
  process.env.NICEPAY_API_URL = 'https://api.nicepay.co.kr'; // 테스트 키도 운영 API 사용
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

const config = {
  PORT: process.env.PORT || 10000,
  MONGODB_URI: process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV || 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://actscript-frontend.onrender.com',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CLIENT_URL: process.env.CLIENT_URL || 'https://actscript-frontend.onrender.com',
  
  // Supabase 설정
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://stuaaylkugnbcedjjaei.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // 나이스페이먼트 설정
  NICEPAY_CLIENT_KEY: process.env.NICEPAY_CLIENT_KEY,
  NICEPAY_SECRET_KEY: process.env.NICEPAY_SECRET_KEY,
  NICEPAY_API_URL: process.env.NICEPAY_API_URL
};

// 디버깅: 나이스페이먼츠 설정 확인
console.log('🔧 나이스페이먼츠 설정 확인:', {
  NICEPAY_CLIENT_KEY: config.NICEPAY_CLIENT_KEY ? `${config.NICEPAY_CLIENT_KEY.substring(0, 10)}...` : '미설정',
  NICEPAY_SECRET_KEY: config.NICEPAY_SECRET_KEY ? '[설정됨]' : '미설정',
  NICEPAY_API_URL: config.NICEPAY_API_URL
});

module.exports = config; 