require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Supabase configuration missing');
}

// Validate key format
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase anon key format. Key should start with "eyJ" (JWT format)');
  console.error('Current key format:', supabaseAnonKey.substring(0, 20) + '...');
  console.error('Please get the correct anon key from your Supabase dashboard > Settings > API');
}

if (supabaseServiceKey && !supabaseServiceKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase service key format. Key should start with "eyJ" (JWT format)');
  console.error('Current key format:', supabaseServiceKey.substring(0, 20) + '...');
  console.error('Please get the correct service role key from your Supabase dashboard > Settings > API');
}

// Client for public operations (uses RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false // Server-side, don't persist sessions
  }
});

// Admin client for authentication operations (bypasses RLS)  
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Test connection function
const testConnection = async () => {
  try {
    console.log('🔍 Supabase 연결 테스트 중...');
    
    const { data, error } = await supabase
      .from('emotions')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase 연결 실패:', error.message);
      return false;
    }
    
    console.log('✅ Supabase 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 테스트 중 오류:', error.message);
    return false;
  }
};

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation = 'operation') => {
  console.error(`❌ Supabase ${operation} error:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  
  // Convert common Supabase errors to user-friendly messages
  switch (error.code) {
    case 'PGRST116':
      return { message: '데이터를 찾을 수 없습니다.', code: 404 };
    case '23505':
      return { message: '이미 존재하는 데이터입니다.', code: 409 };
    case '23503':
      return { message: '참조된 데이터가 존재하지 않습니다.', code: 400 };
    case '42501':
      return { message: '권한이 없습니다.', code: 403 };
    default:
      return { message: '데이터베이스 오류가 발생했습니다.', code: 500 };
  }
};

// User session management helpers
const getUserFromToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('토큰에서 사용자 정보 추출 실패:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('사용자 토큰 검증 중 오류:', error);
    return null;
  }
};

// Database query helpers with error handling
const safeQuery = async (queryFn, operation = 'query') => {
  try {
    const result = await queryFn();
    
    if (result.error) {
      const errorInfo = handleSupabaseError(result.error, operation);
      return { success: false, error: errorInfo };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error(`❌ ${operation} 실행 중 예외 발생:`, error);
    return { success: false, error: { message: '서버 오류가 발생했습니다.', code: 500 } };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  handleSupabaseError,
  getUserFromToken,
  safeQuery
};