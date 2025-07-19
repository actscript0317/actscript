const mongoose = require('mongoose');
const config = require('./env');
const Emotion = require('../models/Emotion');

const connectDB = async () => {
  try {
    console.log('🔍 환경 변수 확인 중...');
    console.log('MONGODB_URI 설정 여부:', config.MONGODB_URI ? '설정됨' : '설정되지 않음');
    
    if (!config.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI 환경 변수가 설정되지 않았습니다.');
      console.warn('⚠️  데이터베이스 기능이 비활성화됩니다.');
      console.warn('⚠️  Render 대시보드에서 환경 변수를 설정해주세요.');
      return;
    }
    
    console.log('🔗 MongoDB 연결 시도 중...');
    console.log('연결 URI (비밀번호 마스킹):', config.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    const conn = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB 연결됨: ${conn.connection.host}`);
    
    // 기본 감정 데이터 삽입
    await seedEmotions();
    
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    console.error('환경 변수 확인: MONGODB_URI =', config.MONGODB_URI ? '설정됨' : '설정되지 않음');
    console.warn('⚠️  서버는 계속 실행되지만 데이터베이스 기능이 비활성화됩니다.');
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
      console.log('기본 감정 데이터 삽입 완료');
    }
  } catch (error) {
    console.log('감정 데이터 삽입 중 오류:', error);
  }
};

module.exports = connectDB; 