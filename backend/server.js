// .env 파일 로드
require('dotenv').config();
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const checkDBConnection = require('./middleware/dbCheck');
const mongoose = require('mongoose');

// 라우트 임포트
const scriptRoutes = require('./routes/scripts');
const emotionRoutes = require('./routes/emotions');
const authRoutes = require('./routes/auth');
const aiScriptRoutes = require('./routes/ai-script');

const app = express();
const PORT = config.PORT;

// 환경 변수를 process.env에 설정 (다른 파일에서 사용할 수 있도록)
Object.assign(process.env, config);

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('요청 헤더:', req.headers);
  console.log('요청 바디:', req.body);
  next();
});

// CORS 설정 (반드시 다른 미들웨어보다 먼저)
const allowedOrigins = [
  'https://actscript-1.onrender.com',  // Render 프론트엔드 도메인 (주요)
  'https://actscript.onrender.com',    // 대체 도메인 (혹시 다른 배포)
  'http://localhost:3000',             // 로컬 개발용
  'http://localhost:5000'              // 로컬 개발용 대체 포트
];

const corsOptions = {
  origin: function(origin, callback) {
    console.log('🔍 CORS 요청 origin:', origin);
    // 임시로 모든 origin 허용 (디버깅용)
    console.log('✅ CORS 허용됨 (임시 - 모든 origin):', origin);
    callback(null, true);
    
    // 원래 로직 (주석 처리)
    // if (!origin || allowedOrigins.indexOf(origin) !== -1) {
    //   console.log('✅ CORS 허용됨:', origin);
    //   callback(null, true);
    // } else {
    //   console.warn('⚠️ CORS 정책으로 인해 차단된 요청:', origin);
    //   console.log('허용된 origins:', allowedOrigins);
    //   callback(new Error('Not allowed by CORS'));
    // }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 프리플라이트 요청 캐시 시간 (10분)
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 프리플라이트 요청 허용

// 데이터베이스 연결
connectDB().then(() => {
  console.log('✅ 데이터베이스 연결 완료');
}).catch(err => {
  console.error('❌ 데이터베이스 연결 실패:', err);
  process.exit(1);
});

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://actscript.onrender.com",
        "https://actscript-1.onrender.com",
        "http://localhost:10000",
        "http://localhost:3000"
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
})); // 보안 헤더 설정
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev')); // 로깅
app.use(express.json({ limit: '10mb' })); // JSON 파싱
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL 인코딩 파싱
app.use(cookieParser()); // 쿠키 파싱

// 데이터베이스 연결 확인 미들웨어
app.use('/api', checkDBConnection);

// API 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/ai-script', aiScriptRoutes);

// 응답 로깅 미들웨어
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    console.log(`📤 [${new Date().toISOString()}] 응답:`, {
      status: res.statusCode,
      body
    });
    return originalJson.call(this, body);
  };
  next();
});

// 기본 라우트
app.get('/', (req, res) => {
  // User-Agent 확인
  const userAgent = req.get('user-agent');
  
  // Render의 헬스 체크 요청인 경우
  if (userAgent && (userAgent.includes('Go-http-client') || userAgent.includes('render'))) {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }

  // 일반 요청인 경우
  res.json({
    message: '연기 대본 라이브러리 API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    status: 'running',
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
  console.log('❌ 404 에러:', req.originalUrl);
  res.status(404).json({
    message: '요청하신 페이지를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 전역 에러 핸들링
app.use((error, req, res, next) => {
  console.error('❌ 서버 에러:', error.stack);
  
  res.status(error.status || 500).json({
    message: config.NODE_ENV === 'production' 
      ? '서버 내부 오류가 발생했습니다.' 
      : error.message,
    ...(config.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// 서버 시작
app.listen(PORT, () => {
  const serverUrl = config.NODE_ENV === 'production'
    ? 'https://actscript-1.onrender.com'
    : `http://localhost:${PORT}`;

  console.log(`
🚀 서버가 포트 ${PORT}에서 실행 중입니다.
🌐 환경: ${config.NODE_ENV}
📖 API 문서: ${serverUrl}/
🔐 인증 API: ${serverUrl}/api/auth
🔄 CORS 허용 도메인: ${config.CORS_ORIGIN}
  `);
});

module.exports = app; 