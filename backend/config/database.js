const mongoose = require('mongoose');
const config = require('./env');
const Emotion = require('../models/Emotion');

const connectDB = async () => {
  try {
    console.log('🔍 환경 변수 확인 중...');
    
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
    }
    
    // 연결 URI 로깅 (비밀번호 마스킹)
    const maskedUri = config.MONGODB_URI.replace(
      /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
      'mongodb$1://***:***@'
    );
    console.log('🔗 MongoDB 연결 시도 중:', maskedUri);
    
    // Render 환경을 위한 MongoDB 연결 옵션
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 20000, // Render의 콜드 스타트를 고려하여 타임아웃 증가
      socketTimeoutMS: 60000, // 소켓 타임아웃 증가
      maxPoolSize: 10, // Render의 무료 티어 리소스 제한 고려
      minPoolSize: 2,
      maxIdleTimeMS: 60000, // 유휴 연결 타임아웃
      connectTimeoutMS: 20000, // 초기 연결 타임아웃
      retryWrites: true,
      w: 'majority',
      // Deprecated 옵션 제거
      heartbeatFrequencyMS: 10000 // 연결 상태 확인 주기
    };

    // MongoDB 연결 시도
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const conn = await mongoose.connect(config.MONGODB_URI, mongooseOptions);
        console.log(`✅ MongoDB 연결됨: ${conn.connection.host}`);
        console.log(`✅ 데이터베이스 이름: ${conn.connection.name}`);
        
        // 연결 이벤트 리스너
        mongoose.connection.on('error', err => {
          console.error('MongoDB 연결 에러:', err);
          // Render 환경에서는 심각한 에러 발생 시 프로세스 재시작
          if (config.NODE_ENV === 'production') {
            console.error('심각한 데이터베이스 오류. 서버를 재시작합니다.');
            process.exit(1);
          }
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB 연결이 끊어졌습니다. 재연결을 시도합니다.');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('MongoDB에 재연결되었습니다.');
        });
        
        // 기본 감정 데이터 삽입
        await seedEmotions();
        
        return conn;
      } catch (error) {
        retryCount++;
        console.error(`❌ MongoDB 연결 시도 ${retryCount}/${maxRetries} 실패:`, error.message);
        
        if (retryCount === maxRetries) {
          throw new Error(`MongoDB 연결 실패 (${maxRetries}회 시도 후)`);
        }
        
        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('MongoDB 서버에 연결할 수 없습니다. 다음을 확인하세요:');
      console.error('1. MongoDB Atlas 클러스터가 실행 중인지');
      console.error('2. IP 화이트리스트에 Render 서버 IP가 등록되어 있는지');
      console.error('3. 데이터베이스 사용자 인증 정보가 올바른지');
      console.error('4. Network Access에서 0.0.0.0/0이 허용되어 있는지');
    }
    
    // Render 환경에서는 연결 실패 시 프로세스 재시작
    if (config.NODE_ENV === 'production') {
      console.error('Render 환경에서 MongoDB 연결 실패. 서버를 재시작합니다.');
      process.exit(1);
    } else {
      console.warn('⚠️ 개발 환경에서 MongoDB 연결 실패. 서버는 계속 실행되지만 데이터베이스 기능이 비활성화됩니다.');
    }
  }
};

// 기본 감정 데이터 삽입 함수
const seedEmotions = async () => {
  try {
    const emotionCount = await Emotion.countDocuments();
    
    if (emotionCount === 0) {
      const defaultEmotions = [
        { name: '기쁨' },
        { name: '슬픔' },
        { name: '분노' },
        { name: '불안' },
        { name: '그리움' },
        { name: '후회' },
        { name: '사랑' },
        { name: '증오' },
        { name: '절망' },
        { name: '희망' }
      ];
      
      await Emotion.insertMany(defaultEmotions);
      console.log('✅ 기본 감정 데이터 삽입 완료');
    }
  } catch (error) {
    console.error('❌ 감정 데이터 삽입 중 오류:', error.message);
    // Render 환경에서는 초기 데이터 삽입 실패도 심각한 문제로 간주
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB; 