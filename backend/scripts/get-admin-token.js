require('dotenv').config();
const axios = require('axios');

async function getAdminToken() {
  try {
    const serverUrl = process.env.SERVER_URL || 'https://actscript-1.onrender.com';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@actpiece.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456!';

    console.log('🔐 관리자 로그인 중...');
    console.log('서버 URL:', serverUrl);
    console.log('관리자 이메일:', adminEmail);

    // 관리자 계정으로 로그인
    const response = await axios.post(`${serverUrl}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });

    if (response.data.success) {
      const token = response.data.session.access_token;
      const user = response.data.user;

      console.log('✅ 로그인 성공!');
      console.log('👤 사용자 정보:');
      console.log('- 이름:', user.name);
      console.log('- 이메일:', user.email);
      console.log('- 역할:', user.role);
      console.log('');
      console.log('🔑 관리자 토큰:');
      console.log(token);
      console.log('');
      console.log('💡 사용 방법:');
      console.log('이 토큰을 복사하여 API 요청 시 다음과 같이 사용하세요:');
      console.log(`Authorization: Bearer ${token}`);
      console.log('');
      console.log('📋 토큰을 환경변수로 저장하려면:');
      console.log(`export ADMIN_TOKEN="${token}"`);

      return token;
    } else {
      console.error('❌ 로그인 실패:', response.data.message);
    }

  } catch (error) {
    console.error('❌ 관리자 토큰 획득 오류:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('');
      console.log('💡 해결 방법:');
      console.log('1. 관리자 계정이 생성되었는지 확인: npm run create-admin');
      console.log('2. 이메일과 비밀번호가 정확한지 확인');
      console.log('3. 서버가 실행 중인지 확인');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  getAdminToken().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });
}

module.exports = { getAdminToken };