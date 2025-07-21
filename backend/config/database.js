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
    
    // MongoDB 연결 옵션
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Render의 콜드 스타트를 고려하여 타임아웃 증가
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Render의 무료 티어 리소스 제한 고려
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    };

    // MongoDB 연결
    const conn = await mongoose.connect(config.MONGODB_URI, mongooseOptions);
    
    console.log(`✅ MongoDB 연결됨: ${conn.connection.host}`);
    console.log(`✅ 데이터베이스 이름: ${conn.connection.name}`);
    
    // 연결 이벤트 리스너 추가
    mongoose.connection.on('error', err => {
      console.error('MongoDB 연결 에러:', err);
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
    console.error('❌ MongoDB 연결 실패:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('MongoDB 서버에 연결할 수 없습니다. 다음을 확인하세요:');
      console.error('1. MongoDB Atlas 클러스터가 실행 중인지');
      console.error('2. IP 화이트리스트에 Render 서버 IP가 등록되어 있는지');
      console.error('3. 데이터베이스 사용자 인증 정보가 올바른지');
    }
    
    // Render에서는 연결 실패 시 항상 프로세스 종료
    console.error('Render 환경에서 MongoDB 연결 실패. 서버를 재시작합니다.');
    process.exit(1);
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