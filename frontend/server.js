const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// MIME 타입 설정 (정적 파일 서빙 전에 설정)
express.static.mime.define({
  'application/javascript': ['js'],
  'text/css': ['css'],
  'text/html': ['html'],
  'application/json': ['json'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
  'font/woff': ['woff'],
  'font/woff2': ['woff2'],
  'application/font-woff': ['woff'],
  'application/font-woff2': ['woff2']
});

// 정적 파일 제공 (올바른 MIME 타입으로)
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// API 라우트가 아닌 모든 요청을 index.html로 처리 (SPA 라우팅)
app.get('*', (req, res) => {
  // Fragment가 있는 경우 (Supabase 인증 콜백 등)
  if (req.originalUrl.includes('#')) {
    console.log('🔗 Fragment URL 감지:', req.originalUrl);
  }
  
  // 올바른 MIME 타입으로 HTML 파일 전송
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 React 앱이 포트 ${port}에서 실행 중입니다.`);
  console.log(`🌐 URL: http://localhost:${port}`);
}); 