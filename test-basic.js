require('dotenv').config();

// 기본 환경 변수 확인
console.log('🔍 환경 변수 확인:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'Not set');
console.log('SUPABASE_ANON_KEY 길이:', process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY 길이:', process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 'Not set');

if (process.env.SUPABASE_ANON_KEY) {
  console.log('ANON_KEY 시작:', process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('SERVICE_KEY 시작:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
}

// JWT 토큰 형식 확인
function isValidJWT(token) {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts[0].startsWith('eyJ');
}

console.log('\n🔍 JWT 토큰 유효성 확인:');
console.log('ANON_KEY JWT 형식:', isValidJWT(process.env.SUPABASE_ANON_KEY));
console.log('SERVICE_KEY JWT 형식:', isValidJWT(process.env.SUPABASE_SERVICE_ROLE_KEY));