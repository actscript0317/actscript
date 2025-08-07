const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 정적 파일 제공 (올바른 MIME 타입으로)
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, filePath, stat) => {
    // 파일 확장자에 따라 올바른 MIME 타입 설정
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    }
    
    // 캐시 헤더 설정 (정적 자원의 성능 향상)
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년
    }
  }
}));

// SPA 라우팅: 정적 파일이 아닌 모든 요청을 index.html로 처리
app.get('*', (req, res) => {
  // Fragment가 있는 경우 로깅 (Supabase 인증 콜백 등)
  if (req.originalUrl.includes('#')) {
    console.log('🔗 Fragment URL 감지:', req.originalUrl);
  }
  
  // 정적 파일 경로 패턴인지 확인
  if (req.path.startsWith('/static/')) {
    // 정적 파일 요청이지만 파일이 없는 경우
    console.log('❌ 정적 파일 요청이지만 파일을 찾을 수 없음:', req.path);
    return res.status(404).send('File not found');
  }
  
  // SPA 라우팅을 위해 index.html 반환
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 React 앱이 포트 ${port}에서 실행 중입니다.`);
  console.log(`🌐 URL: http://localhost:${port}`);
}); 