const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const path = require('path');
const config = require('./config/env');
const connectDB = require('./config/database');

const app = express();

// 데이터베이스 연결
connectDB();

// 간단한 CORS 설정 (server.js에서 이미 설정되어 있다면 생략 가능)
app.use(cors({
  origin: ['https://actscript-1.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// 보안 미들웨어
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// 요청 제한
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10분
  max: 100 // IP당 100개 요청
});
app.use('/api/', limiter);

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// API 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/ai-script', require('./routes/ai-script'));

// 프로덕션 환경에서 정적 파일 제공
if (process.env.NODE_ENV === 'production') {
  // 정적 파일 제공
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // 모든 요청을 React 앱으로 전달
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('❌ 서버 에러:', error.stack);
  
  res.status(error.status || 500).json({
    message: config.NODE_ENV === 'production' 
      ? '서버 내부 오류가 발생했습니다.' 
      : error.message,
    ...(config.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

module.exports = app; 