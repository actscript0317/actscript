// .env 파일 로드
require('dotenv').config();
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');

// 라우트 임포트
const scriptRoutes = require('./routes/scripts');
const emotionRoutes = require('./routes/emotions');
const authRoutes = require('./routes/auth');
const aiScriptRoutes = require('./routes/ai-script');

const app = express();
const PORT = config.PORT;

// 환경 변수를 process.env에 설정 (다른 파일에서 사용할 수 있도록)
Object.assign(process.env, config);

// 데이터베이스 연결
connectDB();

// 미들웨어 설정
app.use(helmet()); // 보안 헤더 설정
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev')); // 로깅
// CORS 설정을 가장 먼저 적용
app.use(cors({
  origin: [
    'https://actscript-1.onrender.com', // 프론트엔드 도메인
    'http://localhost:3000'             // 개발용
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // JSON 파싱
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL 인코딩 파싱
app.use(cookieParser()); // 쿠키 파싱

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/ai-script', aiScriptRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '연기 대본 라이브러리 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      scripts: '/api/scripts',
      emotions: '/api/emotions',
      aiScript: '/api/ai-script'
    }
  });
});

// 404 에러 핸들링
app.use('*', (req, res) => {
  res.status(404).json({
    message: '요청하신 페이지를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 전역 에러 핸들링
app.use((error, req, res, next) => {
  console.error(error.stack);
  
  res.status(error.status || 500).json({
    message: config.NODE_ENV === 'production' 
      ? '서버 내부 오류가 발생했습니다.' 
      : error.message,
    ...(config.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`
🚀 서버가 포트 ${PORT}에서 실행 중입니다.
🌐 환경: ${config.NODE_ENV}
📖 API 문서: http://localhost:${PORT}/
🔐 인증 API: http://localhost:${PORT}/api/auth
  `);
});

module.exports = app; 