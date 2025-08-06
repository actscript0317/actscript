const { supabase, supabaseAdmin } = require('../config/supabase');

async function cleanupAllUsers() {
  try {
    console.log('🧹 모든 사용자 데이터 정리 시작...');
    
    // 1. Authentication Users 모두 조회
    console.log('📋 Authentication Users 조회 중...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Authentication Users 조회 실패:', authError);
      return;
    }
    
    console.log(`📊 총 ${authUsers.users.length}명의 Authentication Users 발견`);
    
    // 2. Table Users 모두 조회
    console.log('📋 Table Users 조회 중...');
    const { data: tableUsers, error: tableError } = await supabase
      .from('users')
      .select('id, email, username');
      
    if (tableError) {
      console.error('❌ Table Users 조회 실패:', tableError);
    } else {
      console.log(`📊 총 ${tableUsers.length}명의 Table Users 발견`);
    }
    
    // 3. Authentication Users 모두 삭제
    console.log('🗑️ Authentication Users 삭제 중...');
    let deletedAuthCount = 0;
    
    for (const user of authUsers.users) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`❌ Auth 사용자 ${user.email} 삭제 실패:`, deleteError.message);
        } else {
          deletedAuthCount++;
          console.log(`✅ Auth 사용자 삭제: ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Auth 사용자 ${user.email} 삭제 중 예외:`, err.message);
      }
    }
    
    // 4. Table Users 모두 삭제 (있는 경우)
    let deletedTableCount = 0;
    
    if (tableUsers && tableUsers.length > 0) {
      console.log('🗑️ Table Users 삭제 중...');
      
      for (const user of tableUsers) {
        try {
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);
            
          if (deleteError) {
            console.error(`❌ Table 사용자 ${user.email} 삭제 실패:`, deleteError.message);
          } else {
            deletedTableCount++;
            console.log(`✅ Table 사용자 삭제: ${user.email || user.username}`);
          }
        } catch (err) {
          console.error(`❌ Table 사용자 ${user.email || user.username} 삭제 중 예외:`, err.message);
        }
      }
    }
    
    // 5. 결과 요약
    console.log('\n🎉 정리 완료!');
    console.log(`📊 삭제된 Authentication Users: ${deletedAuthCount}/${authUsers.users.length}`);
    console.log(`📊 삭제된 Table Users: ${deletedTableCount}/${tableUsers?.length || 0}`);
    
    // 6. 최종 확인
    console.log('\n🔍 최종 확인 중...');
    
    const { data: remainingAuth } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`📊 남은 Authentication Users: ${remainingAuth?.users?.length || 0}명`);
    
    const { data: remainingTable, error: remainingTableError } = await supabase
      .from('users')
      .select('id');
      
    if (!remainingTableError) {
      console.log(`📊 남은 Table Users: ${remainingTable?.length || 0}명`);
    }
    
    console.log('✅ 모든 사용자 데이터 정리 완료!');
    
  } catch (error) {
    console.error('❌ 사용자 데이터 정리 중 오류:', error);
  }
  
  process.exit(0);
}

// 스크립트 실행
cleanupAllUsers();