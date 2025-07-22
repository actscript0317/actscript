module.exports = {
  // 서버 설정
  PORT: 10000,
  NODE_ENV: 'production',

  // 데이터베이스
  MONGODB_URI: 'your_mongodb_uri_here',

  // JWT 설정
  JWT_SECRET: 'your_jwt_secret_here',
  JWT_EXPIRE: '7d',

  // CORS 설정
  CORS_ORIGIN: 'https://actscript-1.onrender.com',
  CLIENT_URL: 'https://actscript-1.onrender.com',

  // OpenAI API 키
  OPENAI_API_KEY: 'your_openai_api_key_here'
}; 