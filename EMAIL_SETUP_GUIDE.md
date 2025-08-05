# 📧 Gmail SMTP 설정 가이드

커스텀 이메일 발송을 위해 Gmail SMTP를 설정하는 방법입니다.

## 1단계: Gmail 2단계 인증 활성화

1. [Google 계정 설정](https://myaccount.google.com/)으로 이동
2. **보안** 탭 클릭
3. **2단계 인증**을 활성화 (이미 활성화되어 있다면 다음 단계로)

## 2단계: 앱 비밀번호 생성

1. [Google 계정 설정 > 보안](https://myaccount.google.com/security)
2. **2단계 인증** 섹션에서 **앱 비밀번호** 클릭
3. **앱 선택**: "메일" 선택
4. **기기 선택**: "기타(맞춤 이름)" 선택하고 "ActScript Backend" 입력
5. **생성** 클릭
6. 생성된 16자리 비밀번호를 복사 (예: `abcd efgh ijkl mnop`)

## 3단계: 환경변수 설정

`backend/.env` 파일에서 다음 값들을 수정하세요:

```env
# 이메일 설정 (Gmail SMTP)
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM_NAME=ActScript
```

### 설정 예시:
```env
# 이메일 설정 (Gmail SMTP)
EMAIL_USER=actscript.service@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM_NAME=ActScript
```

## 4단계: 테스트

1. 서버 재시작
2. 회원가입 시도
3. 이메일함에서 인증번호 확인

## 🔍 문제 해결

### "Authentication failed" 오류
- 앱 비밀번호가 올바른지 확인
- 2단계 인증이 활성화되어 있는지 확인
- 앱 비밀번호의 공백을 제거했는지 확인

### 이메일이 오지 않는 경우
1. 스팸함 확인
2. Gmail에서 "보안 수준이 낮은 앱" 설정 확인
3. 서버 콘솔에서 에러 메시지 확인

### 대안 방법
Gmail 대신 다른 이메일 서비스 사용 가능:
- **SendGrid** (추천)
- **Mailgun**
- **AWS SES**
- **Outlook/Hotmail SMTP**

## 📝 참고사항

- 앱 비밀번호는 한 번만 표시되므로 안전하게 보관하세요
- 프로덕션 환경에서는 전용 이메일 계정 사용을 권장합니다
- 이메일 발송량이 많은 경우 Gmail 대신 전문 이메일 서비스 사용을 고려하세요

## 🚀 완료 후 확인사항

서버를 시작하면 다음과 같은 메시지가 표시되어야 합니다:
```
✅ 이메일 서비스 준비 완료
```

에러가 발생하면:
```
❌ 이메일 서비스 설정 오류: [오류 메시지]
```