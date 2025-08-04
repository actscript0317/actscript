const { supabase } = require('./backend/config/supabase');

async function quickTest() {
  console.log('🔍 Supabase 빠른 연결 테스트...');
  
  try {
    const { data, error } = await supabase
      .from('emotions')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ 오류:', error.message);
      return;
    }
    
    console.log('✅ Supabase 연결 성공!');
    console.log('📊 조회된 감정 데이터:', data.length + '개');
    data.forEach((emotion, index) => {
      console.log('  ' + (index + 1) + '. ' + emotion.name);
    });
    
    console.log('\n🎉 Supabase가 정상적으로 작동하고 있습니다!');
    
  } catch (error) {
    console.error('❌ 예외 발생:', error.message);
  }
}

quickTest();