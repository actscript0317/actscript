const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'build')));

// API 라우트가 아닌 모든 요청을 index.html로 처리 (SPA 라우팅)
app.get('*', (req, res) => {
  // Fragment가 있는 경우 (Supabase 인증 콜백 등)
  if (req.originalUrl.includes('#')) {
    console.log('🔗 Fragment URL 감지:', req.originalUrl);
  }
  
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 React 앱이 포트 ${port}에서 실행 중입니다.`);
  console.log(`🌐 URL: http://localhost:${port}`);
}); 