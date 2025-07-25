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

    // Mailgun 설정
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'sandboxa64e9dcf703543ccbd425e001ef1320a.mailgun.org';
    const FROM_EMAIL = process.env.EMAIL_FROM || 'ActScript <postmaster@sandboxa64e9dcf703543ccbd425e001ef1320a.mailgun.org>';

    if (!MAILGUN_API_KEY) {
      debug('MAILGUN_API_KEY 환경변수 누락 - 개발용 이메일 시뮬레이션');
      console.log('🔐 [개발용] 인증 코드:', options.subject, 'to:', options.email);
      console.log('📧 실제 이메일은 발송되지 않았습니다 (MAILGUN_API_KEY 누락)');
      return { message: '개발 환경 - 이메일 시뮬레이션 완료' };
    }

    // Mailgun 클라이언트 초기화 (예제와 동일한 방식)
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY,
      url: 'https://api.mailgun.net'
    });

    // 이메일 전송 데이터 (예제와 동일한 형식)
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

    // Mailgun을 통해 이메일 전송 (예제와 동일한 방식)
    const data = await mg.messages.create(MAILGUN_DOMAIN, messageData);
    
    debug('이메일 전송 완료', { 
      messageId: data.id,
      message: data.message 
    });

    console.log('✅ Mailgun 이메일 전송 성공:', data);
    return data;

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