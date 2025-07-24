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
const fs = require('fs');
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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"], // blob: 추가
      connectSrc: [
        "'self'",
        "https://actscript.onrender.com",
        "https://actscript-1.onrender.com",
        "http://localhost:10000",
        "http://localhost:3000"
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"], // blob: 추가
      frameSrc: ["'none'"]
    }
  },
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

// 업로드된 파일을 위한 정적 파일 제공 설정
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 [app.js] uploads 디렉토리 생성됨:', uploadsPath);
}

// 하위 디렉토리들도 확인 및 생성
const subDirs = ['profiles', 'recruitments', 'community'];
subDirs.forEach(dir => {
  const subPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
    console.log(`📁 [app.js] ${dir} 하위 디렉토리 생성됨:`, subPath);
  }
});

app.use('/uploads', express.static(uploadsPath));
console.log('📁 [app.js] 정적 파일 제공 설정:', uploadsPath);

// 플레이스홀더 이미지 API (다른 라우트보다 먼저 등록)
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const w = parseInt(width) || 300;
  const h = parseInt(height) || 200;
  
  // SVG 플레이스홀더 이미지 생성
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
        ${w} × ${h}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년 캐시
  res.send(svg);
});

// API 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/ai-script', require('./routes/ai-script'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/bookmarks', require('./routes/bookmarks'));

// 커뮤니티 라우트
app.use('/api/actor-profiles', require('./routes/actor-profiles'));
app.use('/api/actor-recruitments', require('./routes/actor-recruitments'));
app.use('/api/model-recruitments', require('./routes/model-recruitments'));
app.use('/api/community-posts', require('./routes/community-posts'));

// 프로덕션 환경에서 정적 파일 제공
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // API가 아닌 모든 요청에 대해 React 앱 제공 (SPA 라우팅 지원)
  app.get('*', (req, res) => {
    // API 경로가 아닌 경우에만 React 앱 제공
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    } else {
      res.status(404).json({ message: 'API 엔드포인트를 찾을 수 없습니다.' });
    }
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

// 프로덕션에서 모든 React Router 경로를 index.html로 리다이렉트
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

module.exports = app; 