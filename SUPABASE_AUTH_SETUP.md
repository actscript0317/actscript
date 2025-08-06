# Supabase 이메일 인증 설정 가이드

## ⚡ 즉시 해결 방법 (임시)

### 현재 문제
이메일 링크를 클릭하면 Fragment 토큰과 함께 리다이렉트되지만, React 앱이 아직 배포되지 않아서 "Not Found" 오류가 발생.

### 즉시 해결책

1. **Supabase 대시보드 설정 변경**
   - https://supabase.com/dashboard 접속
   - Authentication → Settings → General
   - **Site URL**: `https://actscript-1.onrender.com`
   - **Additional redirect URLs**:
     ```
     https://actscript-1.onrender.com/auth-redirect.html
     https://actscript-1.onrender.com/auth/callback
     ```

2. **이메일 템플릿 수정**
   - Authentication → Email Templates
   - "Confirm signup" 템플릿 편집
   - 링크를 다음으로 변경:
   ```html
   <a href="{{ .SiteURL }}/auth-redirect.html">Confirm your signup</a>
   ```

3. **정적 HTML 파일 배포**
   - `frontend/public/auth-redirect.html` 파일이 생성됨
   - 이 파일이 `https://actscript-1.onrender.com/auth-redirect.html`에서 접근 가능해야 함

### 테스트 방법

1. **새 이메일로 회원가입**
2. **이메일 링크 클릭** → `auth-redirect.html` 페이지로 이동
3. **브라우저 개발자 도구 콘솔 확인**:
   ```
   🔗 인증 처리 페이지 로드됨
   파싱된 토큰 정보: {hasAccessToken: true, type: "signup"}
   ✅ 회원가입 토큰 감지, 처리 시작...
   📧 Supabase 클라이언트 생성 완료
   ✅ 세션 설정 성공: user@email.com
   👤 사용자 정보: {username, name, email}
   ✅ 프로필 생성 완료
   🎉 인증 완료, 로그인 페이지로 이동
   ```

4. **성공 알림 후 로그인 페이지로 자동 이동**

---

## 📝 완전한 해결 방법 (배포 후)

### Fragment 방식 처리 구현 완료

1. **프론트엔드 Fragment 토큰 처리** ✅
   - URL Fragment에서 `access_token`, `refresh_token`, `type` 파싱
   - Supabase 세션 자동 설정
   - 백엔드에 프로필 생성 요청

2. **백엔드 프로필 생성 엔드포인트** ✅
   - `/api/auth/complete-signup` 엔드포인트 추가
   - 토큰 검증 및 사용자 정보 저장
   - 기존 Query Parameter 방식과 호환성 유지

3. **하이브리드 처리 방식** ✅
   - Fragment 방식 (Supabase 표준): 프론트엔드에서 처리
   - Query Parameter 방식 (기존): 백엔드에서 처리

### 배포 후 설정

배포가 완료되면 다음으로 변경:

1. **Supabase redirect URL 복원**:
   ```
   https://actscript-1.onrender.com/auth/callback
   ```

2. **이메일 템플릿 복원**:
   ```html
   <a href="{{ .SiteURL }}/auth/callback">Confirm your signup</a>
   ```

---

## 🎯 당장 해야 할 일

### 1단계: Supabase 설정 변경 (지금 바로)

1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **Additional redirect URLs에 추가**:
   ```
   https://actscript-1.onrender.com/auth-redirect.html
   ```

3. **Email Templates** → **Confirm signup** 편집:
   ```html
   <a href="{{ .SiteURL }}/auth-redirect.html">Confirm your signup</a>
   ```

### 2단계: 테스트

1. **새 이메일로 회원가입 시도**
2. **이메일 링크 클릭**
3. **인증 처리 페이지에서 콘솔 로그 확인**
4. **자동으로 로그인 페이지로 이동하는지 확인**

### 3단계: 문제 해결

만약 여전히 문제가 있다면:

1. **브라우저 개발자 도구** → **Console** 탭에서 오류 메시지 확인
2. **Network** 탭에서 API 요청 상태 확인
3. **오류 메시지 또는 로그를 제공**하여 추가 디버깅

---

## 📋 체크리스트

### 즉시 해결을 위한 체크리스트
- [ ] Supabase Site URL: `https://actscript-1.onrender.com`
- [ ] Additional redirect URLs에 `https://actscript-1.onrender.com/auth-redirect.html` 추가
- [ ] Email template 링크를 `auth-redirect.html`로 변경
- [ ] `auth-redirect.html` 파일이 배포된 사이트에서 접근 가능한지 확인
- [ ] 새 이메일로 회원가입 테스트
- [ ] 이메일 링크 클릭하여 인증 완료까지 테스트

### 완전한 해결을 위한 체크리스트
- [x] Fragment 토큰 방식 처리 구현
- [x] 백엔드 프로필 생성 엔드포인트 추가
- [x] 기존 방식과 호환성 유지
- [ ] 수정된 React 앱 배포
- [ ] Supabase redirect URL을 `/auth/callback`로 복원
- [ ] Email template를 기본값으로 복원

이제 Supabase 대시보드에서 설정만 변경하면 즉시 문제가 해결될 것입니다! 