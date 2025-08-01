const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/env');

// 환경 변수 로드
require('dotenv').config();

// MongoDB 연결
const connectDB = async () => {
  try {
    console.log('🔗 MongoDB 연결 시도 중...');
    console.log('📍 URI:', config.MONGODB_URI ? 'URI 설정됨' : 'URI 없음');
    
    const connection = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10초 타임아웃
      socketTimeoutMS: 45000, // 45초 소켓 타임아웃
    });
    
    console.log('✅ MongoDB 연결 성공');
    console.log('📍 데이터베이스:', connection.connection.db.databaseName);
    console.log('📍 호스트:', connection.connection.host);
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    
    if (error.code === 'EREFUSED') {
      console.error('💡 해결 방법:');
      console.error('   1. 인터넷 연결 확인');
      console.error('   2. MongoDB Atlas 클러스터 상태 확인');
      console.error('   3. 방화벽 설정 확인');
      console.error('   4. IP 화이트리스트 설정 확인');
    }
    
    process.exit(1);
  }
};

// 관리자 계정 생성 함수
const createAdmin = async () => {
  try {
    const adminData = {
      username: 'admin',
      email: 'admin@actscript.com',
      password: 'ActScript2024!@#',
      name: '관리자',
      role: 'admin',
      isEmailVerified: true,
      isActive: true
    };

    // 기존 관리자 계정 확인
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminData.email },
        { username: adminData.username },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️ 관리자 계정이 이미 존재합니다:');
        console.log('   - 사용자명:', existingAdmin.username);
        console.log('   - 이메일:', existingAdmin.email);
        console.log('   - 생성일:', existingAdmin.createdAt);
        
        // 기존 관리자 계정 정보 업데이트 옵션
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        return new Promise((resolve) => {
          rl.question('기존 관리자 계정의 비밀번호를 새로 설정하시겠습니까? (y/N): ', async (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
              try {
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(adminData.password, salt);
                
                await User.findByIdAndUpdate(existingAdmin._id, {
                  password: hashedPassword,
                  isActive: true,
                  isEmailVerified: true
                });
                
                console.log('✅ 기존 관리자 계정의 비밀번호가 업데이트되었습니다.');
                console.log('📧 이메일:', existingAdmin.email);
                console.log('🔑 새 비밀번호:', adminData.password);
              } catch (error) {
                console.error('❌ 비밀번호 업데이트 실패:', error);
              }
            } else {
              console.log('❌ 관리자 계정 생성을 취소했습니다.');
            }
            rl.close();
            resolve();
          });
        });
      } else {
        console.log('❌ 동일한 사용자명 또는 이메일을 사용하는 일반 계정이 존재합니다.');
        console.log('   다른 관리자 정보를 사용하세요.');
        return;
      }
    }

    // 새 관리자 계정 생성
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ 관리자 계정이 성공적으로 생성되었습니다!');
    console.log('📋 계정 정보:');
    console.log('   - 사용자명:', adminData.username);
    console.log('   - 이메일:', adminData.email);
    console.log('   - 비밀번호:', adminData.password);
    console.log('   - 권한:', adminData.role);
    console.log('');
    console.log('🔐 보안상 비밀번호를 기록해두시고, 로그인 후 즉시 변경하세요.');
    console.log('🌐 로그인 URL: https://your-domain.com/login');

  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ 중복된 사용자명 또는 이메일입니다.');
    } else {
      console.error('❌ 관리자 계정 생성 실패:', error.message);
    }
  }
};

// 메인 실행 함수
const main = async () => {
  console.log('🚀 ActScript 관리자 계정 생성 스크립트');
  console.log('=====================================');
  
  await connectDB();
  await createAdmin();
  
  console.log('=====================================');
  console.log('스크립트 실행 완료');
  
  // MongoDB 연결 종료
  await mongoose.connection.close();
  process.exit(0);
};

// 에러 핸들링
process.on('unhandledRejection', (err) => {
  console.error('❌ 처리되지 않은 Promise 거부:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 처리되지 않은 예외:', err);
  process.exit(1);
});

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { createAdmin };