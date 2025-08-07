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
const { testConnection } = require('./config/supabase');

const app = express();

// Supabase 연결만 사용

// Supabase 연결 테스트
testConnection().then(success => {
  if (success) {
    console.log('✅ Supabase 연결 성공');
  } else {
    console.log('⚠️ Supabase 연결 실패 - MongoDB로 계속 진행');
  }
}).catch(error => {
  console.warn('⚠️ Supabase 연결 테스트 중 오류:', error.message);
});

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
        "http://localhost:3000",
        "https://stuaaylkugnbcedjjaei.supabase.co",
        "wss://stuaaylkugnbcedjjaei.supabase.co"
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

// API 라우트 (Mailgun 기반 인증)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/ai-script', require('./routes/ai-script'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/bookmarks', require('./routes/bookmarks'));

// Supabase API 라우트 (새로운)
app.use('/api/v2/auth', require('./routes/supabase-auth'));
app.use('/api/v2/scripts', require('./routes/supabase-scripts'));
app.use('/api/v2/ai-script', require('./routes/supabase-ai-script'));
app.use('/api/v2/test', require('./routes/supabase-test'));

// 커뮤니티 라우트
app.use('/api/actor-profiles', require('./routes/actor-profiles'));
app.use('/api/actor-recruitments', require('./routes/actor-recruitments'));
app.use('/api/model-recruitments', require('./routes/model-recruitments'));
app.use('/api/community-posts', require('./routes/community-posts'));

// 결제 라우트
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin-users', require('./routes/admin-users'));

// SPA 라우팅 지원 (모든 환경)
const buildPath = path.join(__dirname, '../frontend/build');

// 환경 확인 및 디버깅
console.log('🔧 환경 설정 확인:', {
  NODE_ENV: process.env.NODE_ENV,
  buildPath: buildPath,
  buildExists: require('fs').existsSync(buildPath),
  indexExists: require('fs').existsSync(path.join(buildPath, 'index.html'))
});

// 프로덕션에서 정적 파일 제공
if (process.env.NODE_ENV === 'production') {
  console.log('📁 정적 파일 경로 설정:', buildPath);
  
  // 정적 파일 제공 (JS, CSS, 이미지 등)
  app.use(express.static(buildPath, {
    index: false, // index.html 자동 제공 비활성화
    maxAge: '1d', // 캐시 설정
    etag: true
  }));
  
  // favicon 등 루트 레벨 파일들 처리
  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(buildPath, 'favicon.ico'));
  });
}

// API 404 에러 처리 (API 경로만)
app.use('/api/*', (req, res) => {
  console.log(`❌ API 404: ${req.path}`);
  res.status(404).json({ 
    success: false,
    message: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.path 
  });
});

// SPA 라우팅 - 모든 비API 요청에 대해 index.html 제공
app.get('*', (req, res) => {
  // uploads 경로는 정적 파일로 처리
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).send('File not found');
  }
  
  if (process.env.NODE_ENV === 'production') {
    const indexPath = path.join(buildPath, 'index.html');
    console.log(`📄 SPA 라우팅: ${req.path} → index.html`);
    
    // 파일 존재 확인
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('❌ index.html 파일을 찾을 수 없습니다:', indexPath);
      res.status(500).send('Application build not found');
    }
  } else {
    // 개발 환경에서는 404
    res.status(404).send('Development mode - use React dev server');
  }
});

// 전역 에러 핸들러 (맨 마지막)
app.use((error, req, res, next) => {
  console.error('❌ 전역 에러:', error.stack);
  
  res.status(error.status || 500).json({
    success: false,
    message: config.NODE_ENV === 'production' 
      ? '서버 내부 오류가 발생했습니다.' 
      : error.message,
    ...(config.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

module.exports = app; 