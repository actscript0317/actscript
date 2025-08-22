const { supabaseAdmin, safeQuery } = require('../config/supabase');

async function reserveUsage(userId) {
  const userResult = await safeQuery(async () => {
    return await supabaseAdmin.from('users').select('*').eq('id', userId).single();
  }, 'Supabase 사용자 정보 조회');

  if (!userResult.success) throw new Error('사용자를 찾을 수 없습니다.');

  const user = userResult.data;
  const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
  const subscription = user.subscription || { plan: 'test' };

  // reset by month
  const now = new Date();
  const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date(0);
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    usage.currentMonth = 0;
    usage.lastResetDate = now.toISOString();
  }

  const userLimit = user.usage?.monthly_limit ?? 10;
  const limitLabel = userLimit === 999999 ? '무제한' : userLimit;

  if (userLimit !== 999999 && usage.currentMonth >= userLimit) {
    const error = new Error('사용량을 초과했습니다.');
    error.statusCode = 429;
    error.details = {
      currentUsage: usage.currentMonth,
      limit: limitLabel,
      planType: subscription.plan,
      nextResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    };
    throw error;
  }

  // 예약 토큰 (DB에 증가시키지 않음)
  return { user, usage, limitLabel };
}

async function commitUsage(userId) {
  const { data: user } = await supabaseAdmin.from('users').select('usage').eq('id', userId).single();
  const usage = user?.usage || { currentMonth: 0, lastResetDate: new Date().toISOString(), totalGenerated: 0 };
  usage.currentMonth += 1;
  usage.totalGenerated += 1;
  const update = await safeQuery(async () => {
    return await supabaseAdmin.from('users').update({ usage }).eq('id', userId);
  }, '사용량 commit');
  if (!update.success) console.error('❌ 사용량 커밋 실패:', update.error);
}

async function rollbackUsage(/* userId, traceId */) {
  // 지금 구조에선 예약만 하고 증가를 안 했으므로 롤백 할 게 없음.
  // 만약 선증가 구조를 유지한다면 여기서 감소 처리.
}

module.exports = { reserveUsage, commitUsage, rollbackUsage };