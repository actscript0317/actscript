// .env 파일을 만들고 아래 내용을 복사하세요:
/*
PORT=5000
MONGODB_URI=mongodb://localhost:27017/acting_scripts
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
*/

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/acting_scripts',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
}; 