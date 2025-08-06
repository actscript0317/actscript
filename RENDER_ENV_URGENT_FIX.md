# 🚨 긴급 수정: 새로운 Supabase API 키 설정

## 현재 문제
```
❌ AuthApiError: Invalid API key
❌ API Base URL: https://actscript.onrender.com/api (잘못된 URL)
```

## 해결책: 올바른 API 키 사용

---

## 🛠️ Render Dashboard에서 즉시 수정

### 1. Render Dashboard 접속
1. **https://dashboard.render.com** 로그인
2. **actscript-1** 서비스 클릭
3. **Environment** 탭 클릭

### 2. 환경변수 올바르게 설정
기존 잘못된 환경변수들을 **삭제**하고 다음으로 **교체**:

#### ✅ 올바른 프론트엔드 환경변수:
```
REACT_APP_SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os
REACT_APP_API_URL=https://actscript-1.onrender.com/api
```

#### ❌ 삭제해야 할 환경변수들:
- 기존의 `eyJ...` 형태의 구 버전 키들
- `SUPABASE_SERVICE_ROLE_KEY` (프론트엔드에서 사용 불가)
- 잘못된 API URL들

### 3. 백엔드 환경변수도 확인 필요
백엔드에서는 **Secret Key** 사용:
```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_PVaJigblcBi1ixYfFGGlJw_1_6ktIDn
```

---

## 🔧 즉시 테스트 절차

### 1. 환경변수 저장
Render Dashboard에서 환경변수 저장

### 2. 재배포 대기
자동 재배포 완료까지 3-5분 대기

### 3. 브라우저 테스트
1. **캐시 클리어**: Ctrl+Shift+R 또는 시크릿 모드
2. **새 이메일로 회원가입**
3. **이메일 링크 클릭**
4. **브라우저 콘솔 확인**

### 4. 성공 시 예상 로그
```
✅ 🔧 Supabase Key length: 50
✅ 🔧 Supabase Key starts with: sb_publishable_7CFf...
✅ 🌐 Final API Base URL: https://actscript-1.onrender.com/api
✅ ✅ 세션 설정 성공: user@email.com
✅ 📤 백엔드에 프로필 생성 요청
✅ ✅ 프로필 생성 완료
```

---

## 🎯 API 키 체계 정리

### 새로운 Supabase API 키 (2024+)
- **Publishable Key**: `sb_publishable_...` → 브라우저/프론트엔드용 ✅
- **Secret Key**: `sb_secret_...` → 서버/백엔드용 ✅

### 구 버전 API 키 (deprecated)
- **anon key**: `eyJ...` → 더 이상 사용 안 함 ❌
- **service_role key**: `eyJ...` → 백엔드 전용 ❌

---

## 🚀 최종 체크리스트

- [ ] `REACT_APP_SUPABASE_ANON_KEY=sb_publishable_7CFf...` 설정
- [ ] `REACT_APP_API_URL=https://actscript-1.onrender.com/api` 설정
- [ ] 구 버전 `eyJ...` 키들 삭제
- [ ] Render 재배포 완료
- [ ] 회원가입 테스트 성공

**환경변수 설정 후 바로 테스트하세요!** 🎯 