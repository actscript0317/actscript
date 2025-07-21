require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 10000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0',
  NODE_ENV: process.env.NODE_ENV || 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://actscript-1.onrender.com',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-51145114ee',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CLIENT_URL: process.env.CLIENT_URL || 'https://actscript-1.onrender.com'
}; 