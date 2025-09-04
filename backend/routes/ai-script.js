const express = require('express');
const aiScriptRouter = require('./ai-script');

const router = express.Router();

// 새로운 템플릿별 라우터로 리다이렉트
router.use('/', aiScriptRouter);

// 기존 API 호환성 유지를 위한 리다이렉트 설정

// 일반 대본 생성 (기본값)
router.post('/generate', (req, res, next) => {
  const { template, theme } = req.body;
  
  if (template === 'children' && theme) {
    // 어린이 연극으로 리다이렉트
    req.url = '/children/generate';
  } else if (req.body.customPrompt && req.body.customPrompt.trim()) {
    // 커스텀 프롬프트로 리다이렉트  
    req.url = '/custom/generate';
  } else {
    // 일반 대본으로 리다이렉트
    req.url = '/general/generate';
  }
  
  next();
});

module.exports = router;