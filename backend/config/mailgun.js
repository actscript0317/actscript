const Mailgun = require('mailgun.js');
const formData = require('form-data');

// Mailgun 클라이언트 초기화
const mailgun = new Mailgun(formData);

let mg = null;

try {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  
  if (!apiKey || !domain) {
    console.error('❌ Mailgun 설정 오류: API_KEY 또는 DOMAIN이 설정되지 않았습니다.');
    console.error('필요한 환경 변수:');
    console.error('- MAILGUN_API_KEY:', apiKey ? '✅ 설정됨' : '❌ 누락');
    console.error('- MAILGUN_DOMAIN:', domain ? '✅ 설정됨' : '❌ 누락');
  } else {
    mg = mailgun.client({ 
      username: 'api', 
      key: apiKey 
    });
    console.log('✅ Mailgun 클라이언트 초기화 완료');
  }
} catch (error) {
  console.error('❌ Mailgun 초기화 실패:', error);
}

// 인증 코드 이메일 전송
const sendVerificationEmail = async (email, name, verificationCode) => {
  if (!mg) {
    throw new Error('Mailgun 클라이언트가 초기화되지 않았습니다.');
  }

  const emailFrom = process.env.EMAIL_FROM || 'ActScript <noreply@actpiece.com>';
  const domain = process.env.MAILGUN_DOMAIN;

  const emailData = {
    from: emailFrom,
    to: email,
    subject: '[ActScript] 회원가입 인증 코드',
    html: `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ActScript 회원가입 인증</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #6366f1;
          margin-bottom: 10px;
        }
        .verification-code {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
        }
        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .warning {
          color: #ef4444;
          font-weight: 600;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎭 ActScript</div>
          <h1>회원가입 인증 코드</h1>
        </div>
        
        <p>안녕하세요, <strong>${name}</strong>님!</p>
        <p>ActScript 회원가입을 완료하기 위해 아래 인증 코드를 입력해주세요.</p>
        
        <div class="verification-code">
          ${verificationCode}
        </div>
        
        <div class="info-box">
          <h3>📋 인증 방법</h3>
          <ol>
            <li>ActScript 회원가입 페이지로 돌아가세요</li>
            <li>위의 <strong>6자리 인증 코드</strong>를 입력하세요</li>
            <li>"인증 완료" 버튼을 클릭하세요</li>
          </ol>
        </div>
        
        <div class="info-box">
          <p class="warning">⚠️ 중요 안내</p>
          <ul>
            <li>이 코드는 <strong>10분 후</strong>에 만료됩니다</li>
            <li>본인이 요청하지 않았다면 이 이메일을 무시하세요</li>
            <li>코드를 타인과 공유하지 마세요</li>
          </ul>
        </div>
        
        <p>문의사항이 있으시면 언제든 연락주세요.</p>
        <p>감사합니다! 🚀</p>
        
        <div class="footer">
          <p>이 이메일은 ActScript 회원가입 과정에서 자동으로 발송되었습니다.</p>
          <p>© 2025 ActScript. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `,
    text: `
안녕하세요, ${name}님!

ActScript 회원가입을 완료하기 위해 아래 인증 코드를 입력해주세요.

인증 코드: ${verificationCode}

인증 방법:
1. ActScript 회원가입 페이지로 돌아가세요
2. 위의 6자리 인증 코드를 입력하세요
3. "인증 완료" 버튼을 클릭하세요

⚠️ 중요 안내:
- 이 코드는 10분 후에 만료됩니다
- 본인이 요청하지 않았다면 이 이메일을 무시하세요
- 코드를 타인과 공유하지 마세요

문의사항이 있으시면 언제든 연락주세요.
감사합니다!

---
이 이메일은 ActScript 회원가입 과정에서 자동으로 발송되었습니다.
© 2025 ActScript. All rights reserved.
    `
  };

  try {
    console.log(`📧 ${email}로 인증 코드 이메일 발송 시작...`);
    const result = await mg.messages.create(domain, emailData);
    console.log('✅ 인증 코드 이메일 발송 성공:', result.id);
    return result;
  } catch (error) {
    console.error('❌ 인증 코드 이메일 발송 실패:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail
};