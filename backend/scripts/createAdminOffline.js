// 오프라인 관리자 계정 생성 스크립트
// MongoDB 연결 없이 관리자 계정 정보만 생성

const bcrypt = require('bcryptjs');

console.log('🚀 ActScript 관리자 계정 생성 (오프라인 모드)');
console.log('=====================================');
console.log('⚠️  현재 MongoDB 연결이 불가능한 상태입니다.');
console.log('💡 수동으로 관리자 계정을 생성할 수 있는 정보를 제공합니다.');
console.log('');

// 관리자 계정 정보
const adminData = {
  username: 'admin',
  email: 'admin@actscript.com',
  password: 'ActScript2024!@#',
  name: '관리자',
  role: 'admin',
  isEmailVerified: true,
  isActive: true
};

const generateAdminAccount = async () => {
  try {
    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    console.log('📋 관리자 계정 정보:');
    console.log('==================');
    console.log('사용자명:', adminData.username);
    console.log('이메일:', adminData.email);
    console.log('원본 비밀번호:', adminData.password);
    console.log('해싱된 비밀번호:', hashedPassword);
    console.log('이름:', adminData.name);
    console.log('권한:', adminData.role);
    console.log('이메일 인증:', adminData.isEmailVerified);
    console.log('활성 상태:', adminData.isActive);
    console.log('');
    
    // MongoDB 직접 삽입용 JSON
    const mongoDocument = {
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      name: adminData.name,
      role: adminData.role,
      isEmailVerified: adminData.isEmailVerified,
      isActive: adminData.isActive,
      loginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🔧 MongoDB 직접 삽입용 문서:');
    console.log('============================');
    console.log('다음 명령어를 MongoDB Compass나 Atlas에서 실행하세요:');
    console.log('');
    console.log('// users 컬렉션에 삽입');
    console.log('db.users.insertOne(');
    console.log(JSON.stringify(mongoDocument, null, 2));
    console.log(');');
    
    console.log('');
    console.log('📱 또는 MongoDB Atlas 웹 인터페이스에서:');
    console.log('1. https://cloud.mongodb.com 접속');
    console.log('2. 클러스터 → Browse Collections');
    console.log('3. actscript 데이터베이스 → users 컬렉션');
    console.log('4. "INSERT DOCUMENT" 클릭');
    console.log('5. 위의 JSON 문서 붙여넣기');
    
    console.log('');
    console.log('💡 MongoDB 연결 문제 해결 방법:');
    console.log('=============================');
    console.log('1. 인터넷 연결 확인');
    console.log('2. MongoDB Atlas 클러스터 상태 확인');
    console.log('3. IP 주소가 화이트리스트에 등록되어 있는지 확인');
    console.log('4. DNS 서버 변경 (8.8.8.8, 1.1.1.1)');
    console.log('5. 방화벽 설정 확인');
    console.log('6. VPN 사용 중이라면 비활성화 후 재시도');
    
  } catch (error) {
    console.error('❌ 비밀번호 해싱 실패:', error);
  }
};

// 네트워크 연결 테스트를 위한 간단한 함수
const testNetworkConnection = () => {
  const { spawn } = require('child_process');
  
  console.log('🔍 네트워크 연결 테스트:');
  console.log('======================');
  
  // Google DNS 핑 테스트
  const ping = spawn('ping', ['-n', '4', '8.8.8.8'], { stdio: 'inherit' });
  
  ping.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 인터넷 연결 정상');
    } else {
      console.log('❌ 인터넷 연결 문제');
    }
    
    // 이후 관리자 계정 생성 실행
    generateAdminAccount();
  });
  
  ping.on('error', (error) => {
    console.log('❌ 핑 테스트 실패:', error.message);
    // 핑 실패해도 관리자 계정 생성은 진행
    generateAdminAccount();
  });
};

// 메인 실행
testNetworkConnection();