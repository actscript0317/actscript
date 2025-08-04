const express = require('express');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const router = express.Router();

// 연결 테스트
router.get('/connection', async (req, res) => {
  try {
    console.log('🔍 Supabase 연결 테스트 시작...');
    
    // 감정 테이블에서 데이터 조회
    const { data, error } = await supabase
      .from('emotions')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Supabase 쿼리 오류:', error);
      return res.status(500).json({
        success: false,
        message: 'Supabase 연결 실패',
        error: error.message
      });
    }
    
    console.log('✅ Supabase 연결 성공, 데이터:', data);
    
    res.json({
      success: true,
      message: 'Supabase 연결 성공!',
      data: data,
      count: data.length
    });
    
  } catch (error) {
    console.error('❌ 연결 테스트 중 예외:', error);
    res.status(500).json({
      success: false,
      message: '연결 테스트 실패',
      error: error.message
    });
  }
});

// 테이블 목록 조회
router.get('/tables', async (req, res) => {
  try {
    console.log('📋 테이블 목록 조회 시작...');
    
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('❌ 테이블 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '테이블 목록 조회 실패',
        error: error.message
      });
    }
    
    console.log('✅ 테이블 목록 조회 성공:', data);
    
    res.json({
      success: true,
      message: '테이블 목록 조회 성공',
      tables: data.map(t => t.table_name)
    });
    
  } catch (error) {
    console.error('❌ 테이블 목록 조회 중 예외:', error);
    res.status(500).json({
      success: false,
      message: '테이블 목록 조회 실패',
      error: error.message
    });
  }
});

// 감정 데이터 테스트
router.get('/emotions', async (req, res) => {
  try {
    console.log('😊 감정 데이터 조회 시작...');
    
    const result = await safeQuery(async () => {
      return await supabase
        .from('emotions')
        .select('*')
        .order('name');
    }, '감정 데이터 조회');
    
    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }
    
    console.log('✅ 감정 데이터 조회 성공:', result.data.length + '개');
    
    res.json({
      success: true,
      message: '감정 데이터 조회 성공',
      data: result.data,
      count: result.data.length
    });
    
  } catch (error) {
    console.error('❌ 감정 데이터 조회 중 예외:', error);
    res.status(500).json({
      success: false,
      message: '감정 데이터 조회 실패',
      error: error.message
    });
  }
});

// 사용자 생성 테스트 (테스트용)
router.post('/test-user', async (req, res) => {
  try {
    console.log('👤 테스트 사용자 생성 시작...');
    
    const testUser = {
      username: 'test_user_' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      name: '테스트 사용자',
      role: 'user'
    };
    
    const result = await safeQuery(async () => {
      return await supabase
        .from('users')
        .insert(testUser)
        .select()
        .single();
    }, '테스트 사용자 생성');
    
    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }
    
    console.log('✅ 테스트 사용자 생성 성공:', result.data.id);
    
    res.json({
      success: true,
      message: '테스트 사용자 생성 성공',
      user: {
        id: result.data.id,
        username: result.data.username,
        email: result.data.email,
        name: result.data.name
      }
    });
    
  } catch (error) {
    console.error('❌ 테스트 사용자 생성 중 예외:', error);
    res.status(500).json({
      success: false,
      message: '테스트 사용자 생성 실패',
      error: error.message
    });
  }
});

// 환경 변수 확인
router.get('/config', (req, res) => {
  res.json({
    success: true,
    message: 'Supabase 설정 확인',
    config: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.SUPABASE_URL ? 
        process.env.SUPABASE_URL.replace(/https:\/\/(.{8}).*/, 'https://$1...') : 
        'Not set'
    }
  });
});

module.exports = router;