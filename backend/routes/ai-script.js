const express = require('express');

const router = express.Router();

// 임시로 기존 라우터로 리다이렉트 (새 파일들이 배포되면 수정 예정)
try {
  const aiScriptIndexRouter = require('./ai-script/index');
  router.use('/', aiScriptIndexRouter);
} catch (error) {
  console.warn('⚠️ 새 ai-script 모듈을 찾을 수 없습니다. 기존 기능을 임시 유지합니다:', error.message);
  
  // 기본적인 에러 응답만 제공
  router.post('/generate', (req, res) => {
    res.status(503).json({
      error: 'AI 스크립트 서비스가 일시적으로 사용할 수 없습니다.',
      message: '잠시 후 다시 시도해주세요.'
    });
  });
  
  router.get('/usage', (req, res) => {
    res.json({
      success: true,
      usage: {
        currentMonth: 0,
        totalGenerated: 0,
        limit: 10,
        canGenerate: true,
        planType: 'test'
      }
    });
  });
}

module.exports = router;