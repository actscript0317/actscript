const nodemailer = require('nodemailer');
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

    // Gmail SMTP 설정 (기본)
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });

    // 개발 환경에서는 Ethereal Email 사용 (테스트용)
    if (config.NODE_ENV === 'development' && !process.env.EMAIL_FROM) {
      debug('개발 환경: Ethereal Email 사용');
      
      const testAccount = await nodemailer.createTestAccount();
      
      const devTransporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const message = {
        from: `ActScript <${testAccount.user}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
      };

      const info = await devTransporter.sendMail(message);
      debug('개발용 이메일 전송 완료', {
        messageId: info.messageId,
        previewURL: nodemailer.getTestMessageUrl(info)
      });
      
      console.log('📧 테스트 이메일 미리보기:', nodemailer.getTestMessageUrl(info));
      return;
    }

    // 프로덕션 환경에서 Gmail 사용
    const message = {
      from: `ActScript <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(message);
    debug('이메일 전송 완료', { messageId: info.messageId });

  } catch (error) {
    debug('이메일 전송 실패', { error: error.message });
    throw new Error(`이메일 전송에 실패했습니다: ${error.message}`);
  }
};

module.exports = sendEmail;