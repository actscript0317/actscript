const mongoose = require('mongoose');

const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: '데이터베이스가 연결되지 않았습니다.',
      error: 'DATABASE_NOT_CONNECTED',
      details: 'MongoDB 연결이 필요합니다. 환경 변수 MONGODB_URI를 확인해주세요.'
    });
  }
  next();
};

module.exports = checkDBConnection; 