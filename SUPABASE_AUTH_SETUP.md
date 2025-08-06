# Supabase 이메일 인증 설정 가이드

## 문제 상황 (해결됨!)
이메일 인증 링크를 클릭했을 때 "localhost에서 연결을 거부했습니다" 또는 "Not Found" 오류가 발생하는 문제.

## 원인 분석
1. **Supabase 기본 동작**: Supabase는 이메일 인증 시 URL Fragment(#) 방식으로 토큰을 전달
2. **백엔드 처리 방식**: 기존 코드는 Query Parameter(?&) 방식만 처리
3. **URL 형태**: `https://domain.com/auth/callback#access_token=...&type=signup` 

## 해결 완료!

### ✅ 구현된 해결책

1. **프론트엔드 Fragment 토큰 처리**
   - URL Fragment에서 `access_token`, `refresh_token`, `type` 파싱
   - Supabase 세션 자동 설정
   - 백엔드에 프로필 생성 요청

2. **백엔드 프로필 생성 엔드포인트**
   - `/api/auth/complete-signup` 엔드포인트 추가
   - 토큰 검증 및 사용자 정보 저장
   - 기존 Query Parameter 방식과 호환성 유지

3. **하이브리드 처리 방식**
   - Fragment 방식 (Supabase 기본): 프론트엔드에서 처리
   - Query Parameter 방식 (기존): 백엔드에서 처리

## 설정 방법

### 1. Supabase 대시보드 설정 (필수)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 에 로그인
   - 프로젝트 선택

2. **Authentication 설정**
   - 왼쪽 메뉴에서 `Authentication` → `Settings` 클릭

3. **Site URL 설정**
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

2. **Confirm signup 템플릿**
   - 기본 템플릿 사용 (Fragment 방식 지원)
   - 커스텀이 필요한 경우:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your signup</a>
   ```

## 인증 플로우

### Fragment 방식 (Supabase 기본)
```
1. 사용자 회원가입
2. 이메일 발송
3. 이메일 링크 클릭
4. 브라우저: https://actscript-1.onrender.com/auth/callback#access_token=...&type=signup
5. 프론트엔드에서 Fragment 파싱
6. Supabase 세션 설정
7. 백엔드 /api/auth/complete-signup 호출
8. 사용자 프로필 생성
9. 로그인 페이지로 리다이렉트
```

### Query Parameter 방식 (호환성)
```
1. 사용자 회원가입
2. 이메일 발송  
3. 이메일 링크 클릭
4. 백엔드: /api/auth/auth/callback?token_hash=...&type=signup
5. 백엔드에서 토큰 검증
6. 사용자 프로필 생성
7. 프론트엔드로 리다이렉트
```

## 테스트 방법

### 1. 새 회원가입 테스트
```bash
# 회원가입 데이터
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Test123!@#",
  "name": "테스트 사용자"
}
```

### 2. 이메일 인증 확인
- 이메일 수신 확인
- 링크 클릭
- 브라우저 개발자 도구에서 콘솔 로그 확인:
  ```
  📧 인증 콜백 시작
  🔗 현재 URL: https://actscript-1.onrender.com/auth/callback#access_token=...
  🎯 Fragment 파라미터: {hasAccessToken: true, type: "signup"}
  ✅ 세션 설정 성공: test@example.com
  ✅ 프로필 생성 완료
  ```

### 3. 성공 확인
- "회원가입 완료! 🎉" 페이지 표시
- 5초 후 로그인 페이지로 자동 이동
- 로그인 테스트

## 디버깅 정보

### 브라우저 콘솔 로그
```javascript
// Fragment 방식 처리 시
📧 인증 콜백 시작
🔗 현재 URL: https://domain.com/auth/callback#access_token=...
🎯 Fragment 파라미터: {hasAccessToken: true, type: "signup"}
✅ 세션 설정 성공: user@email.com
✅ 프로필 생성 완료
```

### 백엔드 로그
```bash
# 회원가입 시
📧 Supabase 회원가입 및 이메일 발송 시작...
🔗 리다이렉트 URL 설정: https://actscript-1.onrender.com/auth/callback
✅ 회원가입 성공 - 이메일 발송됨

# 프로필 생성 시
📝 회원가입 완료 처리: {userId: "...", email: "...", username: "...", name: "..."}
✅ 토큰 검증 완료: user@email.com
✅ 회원가입 완료: {id: "...", username: "...", email: "..."}
```

## 문제 해결 체크리스트

- [x] Fragment 토큰 방식 처리 구현
- [x] 백엔드 프로필 생성 엔드포인트 추가
- [x] 기존 방식과 호환성 유지
- [ ] Supabase Dashboard Site URL 설정 (`https://actscript-1.onrender.com`)
- [ ] Additional redirect URLs 설정
- [ ] 실제 회원가입 테스트 완료

## 주요 개선사항

1. **완전한 Fragment 토큰 지원**: Supabase 표준 방식 완벽 지원
2. **향상된 에러 처리**: 다양한 오류 상황에 대한 명확한 메시지
3. **보안 강화**: 토큰 검증 및 사용자 정보 일치 확인
4. **호환성 유지**: 기존 Query Parameter 방식도 계속 지원
5. **상세한 로깅**: 문제 발생 시 쉬운 디버깅

## 참고사항

- **Supabase 설정 변경 후 5-10분 정도 기다린 후 테스트**
- **기존 미인증 사용자는 이메일 재발송 기능 이용**
- **개발 환경에서는 localhost 사용 가능, 운영 환경에서는 실제 도메인 필수** 