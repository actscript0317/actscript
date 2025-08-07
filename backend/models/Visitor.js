const { supabase, safeQuery } = require('../config/supabase');

// Visitor 모델을 Supabase 기반으로 변경
class Visitor {
  // 방문자 추가 메서드
  static async addVisitor(ip, page = 'home') {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    try {
      // 오늘 날짜의 방문자 기록 조회
      const existingResult = await safeQuery(async () => {
        return await supabase
          .from('visitors')
          .select('*')
          .eq('ip_address', ip)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`)
          .single();
      }, '기존 방문자 조회');

      if (!existingResult.success) {
        // 새로운 방문자 기록
        const insertResult = await safeQuery(async () => {
          return await supabase
            .from('visitors')
            .insert({
              ip_address: ip,
              path: `/${page}`,
              user_agent: null, // 필요시 req.headers['user-agent']로 설정
              device_type: 'unknown',
              browser: 'unknown',
              os: 'unknown'
            })
            .select()
            .single();
        }, '새 방문자 기록');

        return insertResult.data;
      }

      // 이미 기록된 방문자의 경우 추가 처리 없음
      return existingResult.data;
      
    } catch (error) {
      console.error('방문자 추가 오류:', error);
      // 에러가 발생해도 메인 애플리케이션 흐름을 방해하지 않음
      return null;
    }
  }

  // 기간별 방문자 통계 조회
  static async getStats(startDate, endDate) {
    try {
      const statsResult = await safeQuery(async () => {
        return await supabase
          .from('visitors')
          .select('*')
          .gte('created_at', `${startDate}T00:00:00.000Z`)
          .lt('created_at', `${endDate}T23:59:59.999Z`);
      }, '방문자 통계 조회');

      if (!statsResult.success) {
        return {
          totalVisitors: 0,
          totalPageViews: 0,
          avgVisitorsPerDay: 0
        };
      }

      const visitors = statsResult.data;
      const uniqueIPs = new Set(visitors.map(v => v.ip_address));
      const totalPageViews = visitors.length;
      const totalDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));

      return {
        totalVisitors: uniqueIPs.size,
        totalPageViews: totalPageViews,
        avgVisitorsPerDay: Math.round(uniqueIPs.size / totalDays * 100) / 100
      };
      
    } catch (error) {
      console.error('방문자 통계 조회 오류:', error);
      return {
        totalVisitors: 0,
        totalPageViews: 0,
        avgVisitorsPerDay: 0
      };
    }
  }

  // 일별 방문자 수 조회
  static async getDailyStats(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const statsResult = await safeQuery(async () => {
        return await supabase
          .from('visitors')
          .select('created_at, ip_address')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }, '일별 방문자 통계');

      if (!statsResult.success) {
        return [];
      }

      const visitors = statsResult.data;
      const dailyStats = {};

      // 일별로 그룹화
      visitors.forEach(visitor => {
        const date = visitor.created_at.split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = new Set();
        }
        dailyStats[date].add(visitor.ip_address);
      });

      // 결과 배열로 변환
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        result.push({
          date,
          count: dailyStats[date] ? dailyStats[date].size : 0
        });
      }

      return result;
    } catch (error) {
      console.error('일별 방문자 통계 조회 오류:', error);
      return [];
    }
  }
}

module.exports = Visitor;