const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const router = express.Router();

// 관리자용: 사용자 데이터 동기화 및 정리
router.delete('/cleanup-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ 사용자 데이터 정리 시작: ${userId}`);
    
    // 1. Table Users에서 사용자 삭제
    const { error: tableError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (tableError) {
      console.error('❌ Table Users 삭제 실패:', tableError);
    } else {
      console.log('✅ Table Users 삭제 완료');
    }
    
    // 2. Authentication Users에서 사용자 삭제  
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('❌ Auth User 삭제 실패:', authError);
    } else {
      console.log('✅ Auth User 삭제 완료');
    }
    
    res.json({
      success: true,
      message: '사용자 데이터 정리가 완료되었습니다.',
      results: {
        tableDeleted: !tableError,
        authDeleted: !authError
      }
    });
    
  } catch (error) {
    console.error('사용자 데이터 정리 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 데이터 정리 중 오류가 발생했습니다.'
    });
  }
});

// 관리자용: 데이터 동기화 상태 확인
router.get('/sync-check', async (req, res) => {
  try {
    console.log('🔍 데이터 동기화 상태 확인...');
    
    // Authentication Users 조회
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({
        success: false,
        message: 'Authentication Users 조회 실패',
        error: authError.message
      });
    }
    
    // Table Users 조회  
    const { data: tableUsers, error: tableError } = await supabase
      .from('users')
      .select('id, email, username');
    
    if (tableError) {
      return res.status(500).json({
        success: false,
        message: 'Table Users 조회 실패',
        error: tableError.message
      });
    }
    
    // 동기화 상태 분석
    const authUserIds = new Set(authUsers.users.map(u => u.id));
    const tableUserIds = new Set(tableUsers.map(u => u.id));
    
    const onlyInAuth = authUsers.users.filter(u => !tableUserIds.has(u.id));
    const onlyInTable = tableUsers.filter(u => !authUserIds.has(u.id));
    const synced = authUsers.users.filter(u => tableUserIds.has(u.id));
    
    res.json({
      success: true,
      summary: {
        totalAuthUsers: authUsers.users.length,
        totalTableUsers: tableUsers.length,
        syncedUsers: synced.length,
        onlyInAuth: onlyInAuth.length,
        onlyInTable: onlyInTable.length
      },
      details: {
        onlyInAuth: onlyInAuth.map(u => ({ id: u.id, email: u.email })),
        onlyInTable: onlyInTable.map(u => ({ id: u.id, email: u.email, username: u.username })),
        synced: synced.map(u => ({ id: u.id, email: u.email }))
      }
    });
    
  } catch (error) {
    console.error('동기화 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '동기화 상태 확인 중 오류가 발생했습니다.'
    });
  }
});

// 관리자용: 불일치 데이터 자동 정리
router.post('/auto-sync', async (req, res) => {
  try {
    console.log('🔄 자동 동기화 시작...');
    
    // 동기화 상태 확인
    const syncCheckResponse = await fetch(`${req.protocol}://${req.get('host')}/api/admin-users/sync-check`);
    const syncData = await syncCheckResponse.json();
    
    if (!syncData.success) {
      return res.status(500).json({
        success: false,
        message: '동기화 상태 확인 실패'
      });
    }
    
    const results = {
      deletedFromAuth: 0,
      deletedFromTable: 0,
      errors: []
    };
    
    // Auth에만 있는 사용자들 삭제 (Table에 없는 경우)
    for (const user of syncData.details.onlyInAuth) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (error) {
          results.errors.push(`Auth 사용자 ${user.email} 삭제 실패: ${error.message}`);
        } else {
          results.deletedFromAuth++;
          console.log(`✅ Auth 사용자 삭제: ${user.email}`);
        }
      } catch (err) {
        results.errors.push(`Auth 사용자 ${user.email} 삭제 중 예외: ${err.message}`);
      }
    }
    
    // Table에만 있는 사용자들 삭제 (Auth에 없는 경우)
    for (const user of syncData.details.onlyInTable) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
          
        if (error) {
          results.errors.push(`Table 사용자 ${user.email} 삭제 실패: ${error.message}`);
        } else {
          results.deletedFromTable++;
          console.log(`✅ Table 사용자 삭제: ${user.email}`);
        }
      } catch (err) {
        results.errors.push(`Table 사용자 ${user.email} 삭제 중 예외: ${err.message}`);
      }
    }
    
    res.json({
      success: true,
      message: '자동 동기화가 완료되었습니다.',
      results
    });
    
  } catch (error) {
    console.error('자동 동기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '자동 동기화 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;