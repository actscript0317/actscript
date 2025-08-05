require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 설정이 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function simpleMigration() {
  console.log('🚀 간단 데이터 마이그레이션 시작...');
  
  try {
    // 1. 현재 Supabase 데이터 상태 확인
    console.log('\n📊 현재 데이터베이스 상태:');
    
    const { data: users } = await supabase.from('users').select('count', { count: 'exact', head: true });
    const { data: emotions } = await supabase.from('emotions').select('count', { count: 'exact', head: true });
    const { data: scripts } = await supabase.from('scripts').select('count', { count: 'exact', head: true });
    const { data: aiScripts } = await supabase.from('ai_scripts').select('count', { count: 'exact', head: true });
    
    console.log(`- 사용자: ${users?.length || 0}명`);
    console.log(`- 감정: ${emotions?.length || 0}개`);
    console.log(`- 스크립트: ${scripts?.length || 0}개`);
    console.log(`- AI 스크립트: ${aiScripts?.length || 0}개`);
    
    // 2. 샘플 데이터 생성 (MongoDB가 연결 안 되므로)
    console.log('\n💫 샘플 데이터 생성 중...');
    
    // 샘플 스크립트 데이터
    const sampleScripts = [
      {
        title: '첫 만남의 설렘',
        character_count: 2,
        situation: '카페에서 우연히 마주친 두 사람의 첫 대화',
        content: `A: 안녕하세요? 혹시... 저 기억하세요?
B: 어? 어디서 본 것 같은데...
A: 지난주 도서관에서 같은 책을 보고 계셨잖아요.
B: 아! 맞다! 그때 그분이시군요. 반갑습니다!`,
        emotions: ['기쁨', '설렘', '놀람'],
        gender: '혼성',
        mood: '로맨스',
        duration: '1분 이하',
        age_group: '20대',
        purpose: '연기 연습',
        script_type: '대화',
        author_name: '관리자',
        author_username: 'admin'
      },
      {
        title: '면접 준비',
        character_count: 2,
        situation: '취업 면접을 앞둔 지원자와 면접관의 대화',
        content: `면접관: 자기소개 부탁드립니다.
지원자: 안녕하세요. 저는... (긴장해서 목소리가 떨림)
면접관: 긴장하지 마세요. 편하게 말씀하세요.
지원자: 네, 감사합니다. 다시 시작하겠습니다.`,
        emotions: ['긴장', '불안', '걱정'],
        gender: '전체',
        mood: '진지한',
        duration: '1~3분',
        age_group: '20대',
        purpose: '오디션',
        script_type: '대화',
        author_name: '관리자',
        author_username: 'admin'
      }
    ];
    
    // 스크립트 삽입
    for (const script of sampleScripts) {
      const { error } = await supabase
        .from('scripts')
        .insert(script);
      
      if (error) {
        console.log(`⚠️ 스크립트 "${script.title}" 삽입 실패:`, error.message);
      } else {
        console.log(`✅ 스크립트 "${script.title}" 삽입 성공`);
      }
    }
    
    console.log('\n🎉 샘플 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류:', error.message);
  }
}

simpleMigration();