# 🚨 긴급 수정: Render 환경변수 설정

## 현재 문제
```
❌ AuthApiError: Forbidden use of secret API key in browser
❌ REACT_APP_SUPABASE_URL: (비어있음)
❌ ANON_KEY length: 0
```

## 원인
Render에서 Supabase 환경변수가 제대로 설정되지 않았음

---

## 🛠️ 즉시 수정 방법

### 1. Render Dashboard 접속
1. **https://dashboard.render.com** 로그인
2. **actscript-1** 서비스 클릭
3. **Environment** 탭 클릭

### 2. 환경변수 추가/수정
다음 환경변수들을 **정확히** 설정:

```
REACT_APP_SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFheWxrdWduYmNlZGpqYWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODg1MTYsImV4cCI6MjA2NzQ2NDUxNn0.8vV4YqJuihwgOHPzQdCQZKQdMWLjBAcOx6TmbBB0QWE
```

⚠️ **중요**: `REACT_APP_SUPABASE_ANON_KEY`는 **anon** 키여야 하며, **service_role** 키가 아니어야 합니다!

### 3. 현재 잘못된 설정 확인
혹시 이런 설정이 있다면 **삭제**하세요:
```
❌ SUPABASE_SERVICE_ROLE_KEY (브라우저에서 사용 불가)
❌ REACT_APP_SUPABASE_SERVICE_KEY (잘못된 이름)
```

### 4. 올바른 Supabase 키 확인 방법
**Supabase Dashboard**에서:
1. **Settings** → **API**
2. **Project API keys** 섹션에서:
   - `anon` `public` 키 → `REACT_APP_SUPABASE_ANON_KEY`에 사용
   - `service_role` `secret` 키 → **백엔드에만** 사용

---

## 🔧 수정 후 테스트

### 1. Render 재배포
환경변수 저장 후 자동 재배포 대기 (3-5분)

### 2. 브라우저 테스트
1. **개발자 도구** 열기 (F12)
2. **Console 탭** 확인
3. 새 이메일로 회원가입 테스트

### 3. 성공 시 예상 로그
```
✅ 🌐 API Base URL: https://actscript-1.onrender.com/api
✅ 📧 인증 콜백 시작
✅ 🔗 Fragment 파라미터: {access_token: "...", expires_at: "..."}
✅ ✅ 세션 설정 성공: user@email.com
✅ 📤 백엔드에 프로필 생성 요청
✅ ✅ 프로필 생성 완료
```

---

## 🎯 체크리스트

환경변수 설정 완료 후:

- [ ] `REACT_APP_SUPABASE_URL` 설정됨
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 설정됨 (anon 키)
- [ ] Service Role Key 제거됨 (있었다면)
- [ ] Render 재배포 완료
- [ ] 브라우저에서 회원가입 테스트 성공

---

## 💡 참고사항

### API URL 문제도 해결됨
환경변수 수정으로 다음도 자동 해결:
- ✅ API Base URL이 올바른 백엔드 주소로 설정
- ✅ Supabase 클라이언트 정상 초기화

### 보안 주의사항
- **anon key**는 브라우저에서 안전
- **service_role key**는 절대 브라우저에 노출 금지
- 백엔드에서만 service_role key 사용

---

**환경변수 설정 후 바로 테스트해보세요!** 🚀 