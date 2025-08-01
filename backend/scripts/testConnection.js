const mongoose = require('mongoose');
const config = require('../config/env');

console.log('🔍 MongoDB 연결 테스트');
console.log('=====================');

// 현재 설정된 URI 확인
console.log('📍 MongoDB URI:', config.MONGODB_URI);
console.log('📍 Node.js 버전:', process.version);
console.log('📍 운영체제:', process.platform);

// DNS 조회 테스트
const dns = require('dns');
const util = require('util');
const lookup = util.promisify(dns.lookup);

const testDNS = async () => {
  try {
    console.log('\n🔍 DNS 조회 테스트');
    const result = await lookup('cluster0.esputxc.mongodb.net');
    console.log('✅ DNS 조회 성공:', result);
  } catch (error) {
    console.error('❌ DNS 조회 실패:', error.message);
    console.log('💡 DNS 서버 변경을 시도해보세요 (예: 8.8.8.8, 1.1.1.1)');
  }
};

// 대체 URI로 연결 테스트
const testAlternativeConnection = async () => {
  try {
    console.log('\n🔗 대체 URI로 연결 테스트');
    
    // 직접 IP 주소 사용 (DNS 우회)
    const alternativeURI = 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0&directConnection=false';
    
    console.log('📍 대체 URI 시도 중...');
    
    const connection = await mongoose.connect(alternativeURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // IPv4 강제 사용
      bufferCommands: false,
      maxPoolSize: 10
    });
    
    console.log('✅ MongoDB 연결 성공!');
    console.log('📍 데이터베이스:', connection.connection.db.databaseName);
    console.log('📍 호스트:', connection.connection.host);
    
    // 연결 테스트
    const adminDb = connection.connection.db.admin();
    const status = await adminDb.ping();
    console.log('✅ 핑 테스트 성공:', status);
    
    await mongoose.disconnect();
    console.log('✅ 연결 종료');
    
  } catch (error) {
    console.error('❌ 대체 연결 실패:', error.message);
    console.error('❌ 에러 코드:', error.code);
  }
};

// 메인 실행
const main = async () => {
  await testDNS();
  await testAlternativeConnection();
  
  console.log('\n=====================');
  console.log('테스트 완료');
  process.exit(0);
};

main().catch(console.error);