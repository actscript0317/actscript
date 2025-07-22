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
const errorHandler = require('./middleware/error');

const app = express();

// 데이터베이스 연결
connectDB();

// 기본 CORS 설정
app.use(cors());

// 상세 CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://actscript-1.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // preflight 요청 처리
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
app.use('/api/ai', require('./routes/ai'));

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
app.use(errorHandler);

// 서버 시작
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});

module.exports = app; 