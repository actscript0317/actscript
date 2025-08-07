const Visitor = require('../models/Visitor');

// 방문자 추적 미들웨어
const trackVisitor = (req, res, next) => {
  // API 요청이나 정적 파일 요청은 제외
  if (req.url.startsWith('/api/') || 
      req.url.startsWith('/uploads/') || 
      req.url.startsWith('/health') ||
      req.url.includes('.')) {
    return next();
  }

  // User-Agent 확인 (봇이나 헬스체크 제외)
  const userAgent = req.get('user-agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent) ||
                userAgent.includes('Go-http-client') ||
                userAgent.includes('render');

  if (isBot) {
    return next();
  }

  // 클라이언트 IP 추출
  const ip = req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
             req.headers['x-forwarded-for']?.split(',')[0] ||
             req.headers['x-real-ip'] ||
             '127.0.0.1';

  // 페이지 분류
  let page = 'other';
  const path = req.url.toLowerCase();

  if (path === '/' || path === '/home') {
    page = 'home';
  } else if (path.startsWith('/scripts')) {
    page = 'scripts';
  } else if (path.startsWith('/ai-script')) {
    page = 'aiScript';
  } else if (path.startsWith('/actor-profile')) {
    page = 'actorProfile';
  } else if (path.startsWith('/actor-recruitment')) {
    page = 'actorRecruitment';
  } else if (path.startsWith('/model-recruitment')) {
    page = 'modelRecruitment';
  } else if (path.startsWith('/actor-info')) {
    page = 'actorInfo';
  } else if (path.startsWith('/mypage')) {
    page = 'mypage';
  }

  // 비동기로 방문자 추가 (요청 처리를 블로킹하지 않음)
  setImmediate(async () => {
    try {
      await Visitor.addVisitor(ip, page);
    } catch (error) {
      console.error('방문자 추적 오류:', error);
    }
  });

  next();
};

module.exports = trackVisitor;