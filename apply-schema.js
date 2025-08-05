require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase admin client
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

async function applySchema() {
  console.log('🚀 Supabase 스키마 적용 시작...');
  
  try {
    // 1. 기본 emotions 데이터 먼저 확인/추가
    console.log('📝 기본 감정 데이터 확인 중...');
    
    const { data: existingEmotions, error: checkError } = await supabase
      .from('emotions')
      .select('count', { count: 'exact', head: true });
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('⚠️ emotions 테이블이 없습니다. 테이블 생성이 필요합니다.');
    }
    
    // 2. 기본 감정 데이터 삽입 (테이블이 존재한다면)
    const defaultEmotions = [
      '기쁨', '슬픔', '분노', '두려움', '놀람', '혐오',
      '사랑', '미움', '질투', '부러움', '감사', '후회',
      '절망', '희망', '불안', '안도', '외로움', '그리움',
      '흥분', '지루함', '당황', '부끄러움', '자신감', '열정',
      '피로', '평온', '긴장', '여유', '걱정', '만족'
    ];
    
    if (!checkError || checkError.code === 'PGRST116') {
      console.log('💫 기본 감정 데이터 삽입 중...');
      
      const emotionData = defaultEmotions.map(name => ({ name }));
      
      const { error: insertError } = await supabase
        .from('emotions')
        .upsert(emotionData, { 
          onConflict: 'name',
          ignoreDuplicates: true 
        });
      
      if (insertError) {
        console.log('⚠️ 감정 데이터 삽입 실패 (테이블이 없을 수 있음):', insertError.message);
      } else {
        console.log('✅ 기본 감정 데이터 삽입 완료');
      }
    }
    
    // 3. 테이블 상태 확인
    console.log('\n📊 현재 데이터베이스 상태 확인...');
    
    const tables = ['users', 'emotions', 'scripts', 'ai_scripts'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: 테이블이 존재하지 않음 (${error.code})`);
        } else {
          console.log(`✅ ${table}: 테이블 존재 확인`);
        }
      } catch (err) {
        console.log(`❌ ${table}: 테이블 확인 실패`);
      }
    }
    
    console.log('\n🎉 스키마 적용 프로세스 완료!');
    console.log('\n📋 다음 단계:');
    console.log('1. Supabase 대시보드에서 SQL Editor로 이동');
    console.log('2. migration/supabase-complete-schema.sql 파일 내용을 복사해서 실행');
    console.log('3. 모든 테이블이 생성되었는지 확인');
    
  } catch (error) {
    console.error('❌ 스키마 적용 중 오류:', error.message);
  }
}

applySchema();