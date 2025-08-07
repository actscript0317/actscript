const { supabase } = require('../config/supabase');

// 방문자 추적 미들웨어 (Supabase 기반)
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
      await addVisitorToSupabase(ip, page);
    } catch (error) {
      console.error('방문자 추적 오류:', error);
    }
  });

  next();
};

// Supabase에 방문자 정보 저장
const addVisitorToSupabase = async (ip, page) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    // 오늘 해당 IP, 페이지 조합의 방문 기록이 있는지 확인
    const { data: existing, error: selectError } = await supabase
      .from('visitors')
      .select('*')
      .eq('ip_address', ip)
      .eq('page', page)
      .eq('date', today)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러로 정상적인 상황
      console.error('방문자 조회 중 오류:', selectError);
      return;
    }

    if (existing) {
      // 이미 오늘 방문 기록이 있으면 카운트만 증가
      const { error: updateError } = await supabase
        .from('visitors')
        .update({ 
          visit_count: existing.visit_count + 1,
          last_visit_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('방문자 카운트 업데이트 중 오류:', updateError);
      }
    } else {
      // 새로운 방문 기록 생성
      const { error: insertError } = await supabase
        .from('visitors')
        .insert({
          ip_address: ip,
          page: page,
          date: today,
          visit_count: 1,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('방문자 기록 생성 중 오류:', insertError);
      }
    }
  } catch (error) {
    console.error('방문자 추적 중 예상치 못한 오류:', error);
  }
};

module.exports = trackVisitor;