# Supabase 이메일 인증 설정 가이드

## 문제 상황
이메일 인증 링크를 클릭했을 때 "localhost에서 연결을 거부했습니다" 오류가 발생하는 문제.

## 원인
Supabase 대시보드의 Site URL이 localhost로 설정되어 있어서 이메일 인증 링크가 localhost로 생성됨.

## 해결 방법

### 1. Supabase 대시보드 Site URL 설정

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 에 로그인
   - 프로젝트 선택

2. **Authentication 설정**
   - 왼쪽 메뉴에서 `Authentication` → `Settings` 클릭
   - `General` 탭에서 다음 설정 확인:

3. **Site URL 변경**
   ```
   Site URL: https://actscript-1.onrender.com
   ```

4. **Additional redirect URLs 설정**
   ```
   Additional redirect URLs:
   https://actscript-1.onrender.com/auth/callback
   https://actscript-1.onrender.com/*
   ```

### 2. Email Templates 확인

1. **Email Templates 섹션**
   - `Authentication` → `Email Templates` 클릭

2. **Confirm signup 템플릿 확인**
   - "Confirm signup" 템플릿 편집
   - 링크가 다음과 같이 설정되어 있는지 확인:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?{{ .TokenHash }}">Confirm your signup</a>
   ```

### 3. 환경 변수 확인

백엔드 환경 변수가 올바르게 설정되어 있는지 확인:

```javascript
// backend/config/env.js
CLIENT_URL: 'https://actscript-1.onrender.com'
```

### 4. 테스트 절차

1. **새 회원가입 시도**
   - 이메일 주소로 회원가입
   - 이메일 수신 확인

2. **이메일 링크 확인**
   - 받은 이메일의 인증 링크 URL 확인
   - `https://actscript-1.onrender.com/auth/callback`로 시작하는지 확인

3. **인증 완료 테스트**
   - 링크 클릭
   - 성공 페이지로 리다이렉트되는지 확인

## 추가 디버깅

### 백엔드 로그 확인
회원가입 및 콜백 처리 시 다음 로그를 확인:

```bash
📧 Supabase 회원가입 및 이메일 발송 시작...
🔗 리다이렉트 URL 설정: https://actscript-1.onrender.com/auth/callback
✅ 회원가입 성공 - 이메일 발송됨
📧 이메일 인증 콜백 처리
🎯 설정된 CLIENT_URL: https://actscript-1.onrender.com
```

### 이메일 재발송 기능
인증 메일을 받지 못했거나 링크가 만료된 경우:
- 회원가입 완료 페이지에서 "인증 이메일 재발송" 버튼 클릭
- 로그인 페이지에서 이메일 인증 필요 메시지 나타날 때 재발송 버튼 클릭

## 문제 해결 체크리스트

- [ ] Supabase Dashboard Site URL이 `https://actscript-1.onrender.com`로 설정됨
- [ ] Additional redirect URLs에 콜백 URL이 추가됨  
- [ ] Email Templates에서 `{{ .SiteURL }}`이 올바르게 사용됨
- [ ] 백엔드 CLIENT_URL 환경변수가 올바르게 설정됨
- [ ] 새로운 회원가입으로 이메일 링크 테스트 완료

## 주의사항

1. **Supabase 설정 변경 후 반영 시간**
   - 설정 변경 후 몇 분 정도 기다린 후 테스트
   
2. **기존 미인증 사용자**
   - Site URL 변경 전에 가입한 사용자는 이메일 재발송 필요

3. **개발/운영 환경 분리**
   - 개발 환경에서는 localhost 사용 가능
   - 운영 환경에서는 반드시 실제 도메인 사용 