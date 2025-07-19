const mongoose = require('mongoose');
const config = require('./env');
const Emotion = require('../models/Emotion');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    
    console.log(`MongoDB 연결됨: ${conn.connection.host}`);
    
    // 기본 감정 데이터 삽입
    await seedEmotions();
    
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
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
      console.log('기본 감정 데이터 삽입 완료');
    }
  } catch (error) {
    console.log('감정 데이터 삽입 중 오류:', error);
  }
};

module.exports = connectDB; 