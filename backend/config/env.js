// 환경 변수 설정
// 실제 운영 시에는 .env 파일을 사용하세요

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
}; 