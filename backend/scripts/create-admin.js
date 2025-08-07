require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@actpiece.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456!';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    console.log('🔐 관리자 계정 생성 중...');
    console.log('이메일:', adminEmail);

    // 1. Supabase Auth에 관리자 계정 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        username: adminUsername,
        name: 'Administrator',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth 생성 실패:', authError);
      if (authError.message.includes('already registered')) {
        console.log('⚠️ 이미 등록된 이메일입니다. 기존 사용자를 관리자로 업데이트합니다.');
        
        // 기존 사용자를 관리자로 업데이트
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === adminEmail);
        
        if (existingUser) {
          console.log('기존 사용자 ID:', existingUser.id);
          await updateUserToAdmin(existingUser.id, adminUsername);
          return;
        }
      }
      return;
    }

    console.log('✅ Auth 계정 생성 완료:', authData.user.id);

    // 2. users 테이블에 관리자 프로필 생성
    await updateUserToAdmin(authData.user.id, adminUsername);

  } catch (error) {
    console.error('❌ 관리자 계정 생성 오류:', error);
  }
}

async function updateUserToAdmin(userId, username) {
  try {
    // users 테이블에 관리자 정보 저장/업데이트
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        username: username,
        email: process.env.ADMIN_EMAIL || 'admin@actpiece.com',
        name: 'Administrator',
        role: 'admin',
        subscription: 'premium',
        is_active: true,
        is_email_verified: true,
        usage: {
          currentMonth: 0,
          monthly_limit: 999999,
          totalGenerated: 0
        },
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('❌ 사용자 프로필 생성 실패:', error);
      return;
    }

    console.log('✅ 관리자 프로필 생성 완료');
    console.log('📋 관리자 계정 정보:');
    console.log('- 이메일:', process.env.ADMIN_EMAIL || 'admin@actpiece.com');
    console.log('- 비밀번호:', process.env.ADMIN_PASSWORD || 'admin123456!');
    console.log('- 사용자명:', username);
    console.log('- 역할: admin');
    console.log('');
    console.log('🚀 이제 이 계정으로 로그인하여 관리자 토큰을 받을 수 있습니다.');

  } catch (error) {
    console.error('❌ 사용자 프로필 업데이트 오류:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  createAdmin().then(() => {
    console.log('🎉 관리자 계정 생성 프로세스 완료');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });
}

module.exports = { createAdmin };