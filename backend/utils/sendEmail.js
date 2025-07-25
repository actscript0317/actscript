const Mailgun = require('mailgun.js');
const FormData = require('form-data');
const config = require('../config/env');

// 디버그 로그 유틸리티
const debug = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📧 Email Service - ${message}`, data);
};

// 이메일 전송 함수
const sendEmail = async (options) => {
  try {
    debug('이메일 전송 시작', {
      to: options.email,
      subject: options.subject
    });

    // Mailgun 설정 (환경변수에서만 가져옴)
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'actpiece.com';
    const FROM_EMAIL = process.env.EMAIL_FROM || 'ActScript <noreply@actpiece.com>';

    if (!MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // Mailgun 클라이언트 초기화
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY,
      url: 'https://api.mailgun.net'
    });

    // 이메일 전송 데이터
    const messageData = {
      from: FROM_EMAIL,
      to: [options.email],
      subject: options.subject,
      html: options.html
    };

    debug('Mailgun으로 이메일 전송 시도', {
      domain: MAILGUN_DOMAIN,
      to: options.email,
      from: FROM_EMAIL
    });

    // Mailgun을 통해 이메일 전송
    const result = await mg.messages.create(MAILGUN_DOMAIN, messageData);
    
    debug('이메일 전송 완료', { 
      messageId: result.id,
      message: result.message 
    });

    console.log('✅ Mailgun 이메일 전송 성공:', result.message);
    return result;

  } catch (error) {
    debug('이메일 전송 실패', { 
      error: error.message,
      code: error.code,
      response: error.response
    });
    console.error('이메일 전송 상세 오류:', error);
    throw new Error(`이메일 전송에 실패했습니다: ${error.message}`);
  }
};

module.exports = sendEmail;