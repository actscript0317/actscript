const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const config = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

const app = express();

// 데이터베이스 연결
connectDB();

// CORS 설정
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://actscript.onrender.com', 'https://www.actscript.com'] 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 보안 미들웨어
app.use(helmet());
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

// 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/ai', require('./routes/ai'));

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});

module.exports = app; 