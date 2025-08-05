const nodemailer = require('nodemailer');

// 이메일 서비스 설정
class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Gmail SMTP 설정 (환경변수에서 가져옴)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });

    // 연결 테스트
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ 이메일 서비스 설정 오류:', error);
      } else {
        console.log('✅ 이메일 서비스 준비 완료');
      }
    });
  }

  // 회원가입 인증 이메일 발송
  async sendVerificationCode(email, name, code) {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ActScript 회원가입 인증</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6; 
            color: #333;
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
          }
          .code-section {
            background: #f8f9ff;
            border: 2px solid #667eea;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          .code { 
            font-size: 36px; 
            font-weight: bold; 
            color: #667eea; 
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .instructions {
            background: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .instructions h3 {
            color: #856404;
            margin-bottom: 10px;
          }
          .instructions ul {
            list-style: none;
            padding: 0;
          }
          .instructions li {
            padding: 5px 0;
            color: #856404;
          }
          .instructions li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
          }
          .footer { 
            background: #f8f9fa;
            padding: 30px;
            text-align: center; 
            color: #666; 
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            margin: 5px 0;
          }
          .logo {
            font-size: 24px;
            margin-right: 10px;
          }
          .warning {
            background: #ffe6e6;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #721c24;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><span class="logo">🎭</span>ActScript</h1>
            <p>회원가입 인증번호</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              안녕하세요 <strong>${name}</strong>님! 👋
            </div>
            
            <p>ActScript 회원가입을 위한 인증번호를 보내드립니다.</p>
            
            <div class="code-section">
              <div class="code-label">인증번호</div>
              <div class="code">${code}</div>
            </div>
            
            <div class="instructions">
              <h3>📋 인증 방법</h3>
              <ul>
                <li>웹사이트의 인증번호 입력 화면에 위의 6자리 번호를 입력하세요</li>
                <li>인증번호는 <strong>10분간</strong> 유효합니다</li>
                <li>시간이 초과되면 재발송을 요청해주세요</li>
              </ul>
            </div>
            
            <div class="warning">
              <strong>⚠️ 보안 주의사항</strong><br>
              본인이 요청하지 않은 경우 이 이메일을 무시하고 삭제해주세요.
            </div>
          </div>
          
          <div class="footer">
            <p><strong>ActScript 팀</strong></p>
            <p>연기 대본 라이브러리 서비스</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
              이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      ActScript 회원가입 인증
      
      안녕하세요 ${name}님!
      
      ActScript 회원가입을 위한 인증번호: ${code}
      
      인증번호는 10분간 유효합니다.
      웹사이트에서 인증번호를 입력하여 회원가입을 완료해주세요.
      
      본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
      
      감사합니다.
      ActScript 팀
    `;

    const mailOptions = {
      from: {
        name: 'ActScript',
        address: process.env.EMAIL_USER || 'noreply@actscript.com'
      },
      to: email,
      subject: '[ActScript] 회원가입 인증번호',
      text: textContent,
      html: htmlTemplate
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ 인증 이메일 발송 성공:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ 인증 이메일 발송 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 인증번호 재발송
  async resendVerificationCode(email, name, code) {
    return await this.sendVerificationCode(email, name, code);
  }
}

// 싱글톤 인스턴스 생성
const emailService = new EmailService();

module.exports = emailService;