// .env 파일 로드
require('dotenv').config();
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const checkDBConnection = require('./middleware/dbCheck');
const visitorTracker = require('./middleware/visitorTracker');
const mongoose = require('mongoose');

// 라우트 임포트
const scriptRoutes = require('./routes/scripts');
const emotionRoutes = require('./routes/emotions');
const authRoutes = require('./routes/auth');
const aiScriptRoutes = require('./routes/ai-script');
const actorProfileRoutes = require('./routes/actor-profiles');
const actorRecruitmentRoutes = require('./routes/actor-recruitments');
const communityPostRoutes = require('./routes/community-posts');
const modelRecruitmentRoutes = require('./routes/model-recruitments');
const likeRoutes = require('./routes/likes');
const bookmarkRoutes = require('./routes/bookmarks');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

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
  'https://www.actpiece.com',          // 실제 도메인 (www)
  'https://actpiece.com',              // 실제 도메인 (www 없이)
  'http://localhost:3000',             // 로컬 개발용
  'http://localhost:5000',             // 로컬 개발용 대체 포트
  'http://localhost:3001'              // 추가 로컬 포트
];

const corsOptions = {
  origin: function(origin, callback) {
    console.log('🔍 CORS 요청 origin:', origin);
    
    // 실제 허용된 origin 확인
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS 허용됨:', origin);
      callback(null, true);
    } else {
      console.warn('⚠️ CORS 정책으로 인해 차단된 요청:', origin);
      console.log('허용된 origins:', allowedOrigins);
      // 임시로 허용 (프로덕션에서는 제거 필요)
      console.log('🚧 임시로 허용합니다.');
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 프리플라이트 요청 캐시 시간 (10분)
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 프리플라이트 요청 허용

// 방문자 추적 미들웨어 (CORS 설정 이후, 다른 미들웨어 이전)
app.use(visitorTracker);

// 데이터베이스 연결
connectDB().then(() => {
  console.log('✅ 데이터베이스 연결 완료');
}).catch(err => {
  console.error('❌ 데이터베이스 연결 실패:', err);
  process.exit(1);
});

// 미들웨어 설정 - 기본 보안 정책
console.log('🔐 [CSP 설정] 기본 보안 정책 적용');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // React 개발용
        "'unsafe-eval'" // React 개발용  
      ],
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'" // React 동적 스크립트 허용
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'"
      ],
      fontSrc: [
        "'self'",
        "data:"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:",
        "https:",
        "http:"
      ],
      connectSrc: [
        "'self'",
        "https://actscript.onrender.com",
        "https://actscript-1.onrender.com"
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev')); // 로깅
app.use(express.json({ limit: '10mb' })); // JSON 파싱
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL 인코딩 파싱
app.use(cookieParser()); // 쿠키 파싱

// 업로드된 파일을 위한 정적 파일 제공 설정
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 [server.js] uploads 디렉토리 생성됨:', uploadsPath);
}

// 하위 디렉토리들도 확인 및 생성
const subDirs = ['profiles', 'recruitments', 'community'];
subDirs.forEach(dir => {
  const subPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
    console.log(`📁 [server.js] ${dir} 하위 디렉토리 생성됨:`, subPath);
  }
});

// Render 환경에서 정적 파일 처리를 위한 개선된 미들웨어
app.use('/uploads', (req, res, next) => {
  const urlPath = req.url;
  console.log(`📷 [정적파일 요청] ${req.method} ${urlPath} from ${req.ip || req.connection.remoteAddress}`);
  
  // Render 환경에서는 파일이 휘발성이므로 항상 placeholder 응답
  if (process.env.NODE_ENV === 'production' && process.env.RENDER) {
    console.log(`🏭 [Render 환경] 파일 요청 → placeholder 응답: ${urlPath}`);
    
    // 요청된 URL에서 예상 크기 추출
    let width = 300, height = 400;
    if (urlPath.includes('wide') || urlPath.includes('recruitment') || urlPath.includes('community')) {
      width = 300;
      height = 200;
    }
    
    // Render 환경에서는 항상 SVG placeholder 응답
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width/2}" cy="${height*0.3}" r="${Math.min(width,height)*0.08}" fill="#2196f3" opacity="0.8"/>
      <rect x="${width*0.35}" y="${height*0.35}" width="${width*0.3}" height="${height*0.15}" rx="5" fill="#1976d2" opacity="0.7"/>
      <text x="50%" y="${height*0.6}" font-family="Arial, sans-serif" font-size="14" fill="#1565c0" text-anchor="middle" font-weight="bold">
        ActScript
      </text>
      <text x="50%" y="${height*0.72}" font-family="Arial, sans-serif" font-size="12" fill="#424242" text-anchor="middle">
        업로드된 이미지
      </text>
      <text x="50%" y="${height*0.82}" font-family="Arial, sans-serif" font-size="10" fill="#757575" text-anchor="middle">
        Render 환경에서는 임시 저장
      </text>
      <text x="50%" y="${height*0.9}" font-family="Arial, sans-serif" font-size="10" fill="#757575" text-anchor="middle">
        ${width} × ${height}
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(svg);
  }
  
  // 로컬 개발 환경에서는 기존 로직 사용
  const fullPath = path.join(__dirname, 'uploads', urlPath.substring(1));
  const exists = fs.existsSync(fullPath);
  
  console.log(`🔍 [파일 존재 확인] ${fullPath} → ${exists ? '✅ 존재' : '❌ 없음'}`);
  
  if (!exists) {
    console.log(`❌ [파일 없음] ${urlPath} → 기본 이미지 SVG 응답`);
    
    // 파일명에서 확장자 제거 후 다른 확장자로 시도
    const filePathWithoutExt = fullPath.replace(/\.[^/.]+$/, "");
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    
    for (const ext of possibleExtensions) {
      const alternativePath = filePathWithoutExt + ext;
      if (fs.existsSync(alternativePath)) {
        console.log(`✅ [대체 파일 발견] ${alternativePath}`);
        return res.sendFile(alternativePath);
      }
    }
    
    // 요청된 URL에서 예상 크기 추출
    let width = 300, height = 400;
    if (urlPath.includes('wide') || urlPath.includes('recruitment') || urlPath.includes('community')) {
      width = 300;
      height = 200;
    }
    
    // 파일이 없으면 직접 SVG 응답
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width/2}" cy="${height*0.3}" r="${Math.min(width,height)*0.08}" fill="#2196f3" opacity="0.8"/>
      <rect x="${width*0.35}" y="${height*0.35}" width="${width*0.3}" height="${height*0.15}" rx="5" fill="#1976d2" opacity="0.7"/>
      <text x="50%" y="${height*0.65}" font-family="Arial, sans-serif" font-size="14" fill="#1565c0" text-anchor="middle" font-weight="bold">
        ActScript
      </text>
      <text x="50%" y="${height*0.75}" font-family="Arial, sans-serif" font-size="12" fill="#424242" text-anchor="middle">
        이미지 없음
      </text>
      <text x="50%" y="${height*0.9}" font-family="Arial, sans-serif" font-size="10" fill="#757575" text-anchor="middle">
        ${width} × ${height}
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(svg);
  }
  
  // 파일이 존재하는 경우 확장자에 따라 Content-Type 설정
  const ext = path.extname(urlPath).toLowerCase();
  if (ext === '.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  } else if (ext === '.webp') {
    res.setHeader('Content-Type', 'image/webp');
  } else if (ext === '.gif') {
    res.setHeader('Content-Type', 'image/gif');
  }
  
  next();
});

app.use('/uploads', express.static(uploadsPath));
console.log('📁 [server.js] 정적 파일 제공 설정 완료:', uploadsPath);

// 데이터베이스 연결 확인 미들웨어
app.use('/api', checkDBConnection);

// 플레이스홀더 이미지 API
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const w = parseInt(width) || 300;
  const h = parseInt(height) || 200;
  
  console.log(`📷 플레이스홀더 이미지 요청: ${w}x${h} from ${req.ip}`);
  
  // SVG 플레이스홀더 이미지 생성
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">
        이미지 없음
      </text>
      <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle" dy=".3em">
        ${w} × ${h}
      </text>
      <circle cx="${w/2}" cy="${h*0.3}" r="${Math.min(w,h)*0.08}" fill="#d1d5db" opacity="0.5"/>
      <polygon points="${w*0.4},${h*0.35} ${w*0.6},${h*0.35} ${w*0.5},${h*0.25}" fill="#9ca3af" opacity="0.7"/>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년 캐시
  res.send(svg);
});

// 응답 로깅 미들웨어 (라우트 설정 전에 위치)
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

// API 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/ai-script', aiScriptRoutes);
app.use('/api/actor-profiles', actorProfileRoutes);
app.use('/api/actor-recruitments', actorRecruitmentRoutes);
app.use('/api/community-posts', communityPostRoutes);
app.use('/api/model-recruitments', modelRecruitmentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// 프로덕션 환경에서 React 앱 제공 설정
if (config.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  
  // React 앱의 빌드된 정적 파일들 제공
  app.use(express.static(frontendBuildPath));
  
  console.log('🎯 [프로덕션] React 빌드 파일 제공:', frontendBuildPath);
}

// 기본 라우트 (API 전용)
app.get('/api', (req, res) => {
  res.json({
    message: '연기 대본 라이브러리 API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      scripts: '/api/scripts',
      emotions: '/api/emotions',
      aiScript: '/api/ai-script'
    }
  });
});

// 헬스 체크 라우트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// SPA 라우팅을 위한 catch-all 핸들러 (모든 API가 아닌 요청을 React 앱으로 라우팅)
app.get('*', (req, res, next) => {
  // API 요청이나 uploads 요청은 제외
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
    return next();
  }
  
  // User-Agent 확인 (Render 헬스 체크)
  const userAgent = req.get('user-agent');
  if (userAgent && (userAgent.includes('Go-http-client') || userAgent.includes('render'))) {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }

  // 프로덕션 환경에서는 React 앱 제공
  if (config.NODE_ENV === 'production') {
    const frontendBuildPath = path.join(__dirname, '../frontend/build');
    const indexPath = path.join(frontendBuildPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log(`🎯 [SPA 라우팅] ${req.url} → React 앱 제공`);
      return res.sendFile(indexPath);
    } else {
      console.log(`❌ [SPA 라우팅] React 빌드 파일 없음: ${indexPath}`);
    }
  }
  
  // 개발 환경이거나 빌드 파일이 없는 경우 기본 API 응답
  res.json({
    message: '연기 대본 라이브러리 API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    status: 'running',
    note: config.NODE_ENV === 'development' 
      ? '개발 환경에서는 프론트엔드를 별도로 실행해주세요 (npm run dev)'
      : 'React 빌드 파일을 찾을 수 없습니다.',
    endpoints: {
      auth: '/api/auth',
      scripts: '/api/scripts',
      emotions: '/api/emotions',
      aiScript: '/api/ai-script'
    }
  });
});

// API 404 에러 핸들링 (위의 catch-all에서 처리되지 않은 API 요청들)
app.use('/api/*', (req, res) => {
  console.log('❌ API 404 에러:', req.originalUrl);
  res.status(404).json({
    message: '요청하신 API 엔드포인트를 찾을 수 없습니다.',
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

// 서버 시작 함수
const startServer = async () => {
  try {
    await connectDB();
    
    // uploads 디렉토리 상태 확인
    const uploadsPath = path.join(__dirname, 'uploads');
    console.log('\n📁 [서버 시작] uploads 디렉토리 상태 확인:');
    console.log('- 메인 디렉토리:', uploadsPath, fs.existsSync(uploadsPath) ? '✅ 존재' : '❌ 없음');
    
    const subDirs = ['profiles', 'recruitments', 'community'];
    subDirs.forEach(dir => {
      const subPath = path.join(uploadsPath, dir);
      const exists = fs.existsSync(subPath);
      console.log(`- ${dir} 디렉토리:`, subPath, exists ? '✅ 존재' : '❌ 없음');
      
      if (exists) {
        try {
          const files = fs.readdirSync(subPath);
          const imageFiles = files.filter(f => !f.startsWith('.'));
          console.log(`  └ 업로드된 파일 수: ${imageFiles.length}개`);
        } catch (err) {
          console.log(`  └ 파일 목록 읽기 실패: ${err.message}`);
        }
      }
    });
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 환경: ${config.NODE_ENV}`);
      console.log(`🌐 CORS 허용 도메인: ${config.CORS_ORIGIN}`);
      console.log('📁 정적 파일 제공: /uploads -> ' + uploadsPath);
      console.log(`💾 MongoDB 연결: ${config.MONGODB_URI ? '설정됨' : '미설정'}`);
      console.log('==================================================\n');
    });

    // 서버 종료 시 정리
    process.on('SIGINT', () => {
      console.log('\n⚡ 서버 종료 중...');
      server.close(() => {
        console.log('✅ 서버 종료 완료');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작 실행
startServer();

module.exports = app; 