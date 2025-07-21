// 환경 변수 설정
// Render 배포 시 환경 변수를 대시보드에서 설정하세요
// 필요한 환경 변수:
// - MONGODB_URI: MongoDB Atlas 연결 문자열
// - PORT: Render에서 자동 할당 (기본값 10000)
// - NODE_ENV: production
// - CORS_ORIGIN: 프론트엔드 도메인 (예: https://actscript-frontend.onrender.com)
// - JWT_SECRET: 프로덕션용 보안 키
// - JWT_EXPIRE: JWT 토큰 만료 시간
// - OPENAI_API_KEY: OpenAI API 키 (선택사항)

module.exports = {
  PORT: process.env.PORT || 10000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0',
  NODE_ENV: process.env.NODE_ENV || 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://actscript-1.onrender.com',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
}; 