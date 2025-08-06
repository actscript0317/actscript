# 🚀 ActScript 배포 가이드

## 현재 상황
- 백엔드: `https://actscript-1.onrender.com` 배포됨
- 프론트엔드: 배포 필요

## 목표 구조
- 백엔드: `https://actscript-backend.onrender.com`
- 프론트엔드: `https://actscript-frontend.onrender.com`

---

## 🎯 완전한 배포 프로세스

### 1단계: Render에서 새 서비스 생성

#### 백엔드 서비스
1. **Render Dashboard** → **New Web Service**
2. **GitHub Repository 연결**
3. **설정**:
   ```
   Name: actscript-backend
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

4. **환경 변수 설정**:
   ```
   NODE_ENV=production
   CLIENT_URL=https://actscript-frontend.onrender.com
   SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### 프론트엔드 서비스
1. **Render Dashboard** → **New Static Site**
2. **GitHub Repository 연결**
3. **설정**:
   ```
   Name: actscript-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

4. **환경 변수 설정**:
   ```
   REACT_APP_API_URL=https://actscript-backend.onrender.com/api
   REACT_APP_SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2단계: Supabase 설정 업데이트

1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **Site URL 변경**:
   ```
   https://actscript-frontend.onrender.com
   ```

3. **Additional redirect URLs**:
   ```
   https://actscript-frontend.onrender.com/auth/callback
   https://actscript-frontend.onrender.com/*
   ```

### 3단계: DNS 설정 (선택사항)

만약 커스텀 도메인을 사용한다면:

1. **도메인 구매** (예: actscript.com)
2. **Render에서 커스텀 도메인 설정**:
   - 프론트엔드: `www.actscript.com`
   - 백엔드: `api.actscript.com`

3. **Supabase 설정 업데이트**:
   ```
   Site URL: https://www.actscript.com
   Redirect URLs: https://www.actscript.com/auth/callback
   ```

---

## 🔧 현재 배포 수정

현재 `actscript-1.onrender.com`이 배포되어 있다면:

### 즉시 수정 방법

1. **현재 서비스 환경 변수 확인/수정**:
   ```
   CLIENT_URL=https://actscript-1.onrender.com
   ```

2. **Supabase 설정 확인**:
   ```
   Site URL: https://actscript-1.onrender.com
   Additional redirect URLs: https://actscript-1.onrender.com/auth/callback
   ```

3. **코드 재배포**:
   - GitHub에 코드 푸시
   - Render에서 자동 재배포 확인

---

## 🧪 테스트 체크리스트

배포 완료 후 다음을 확인:

### 기본 기능
- [ ] 홈페이지 로딩
- [ ] 회원가입 페이지 접근
- [ ] 로그인 페이지 접근

### 회원가입 플로우
- [ ] 새 이메일로 회원가입
- [ ] 이메일 수신 확인
- [ ] 이메일 링크 클릭
- [ ] `/auth/callback` 페이지 로딩
- [ ] 프로필 생성 완료
- [ ] 로그인 페이지로 리다이렉트

### 로그인 플로우
- [ ] 회원가입한 이메일/패스워드로 로그인
- [ ] 대시보드 접근
- [ ] 로그아웃 기능

### API 연결
- [ ] 브라우저 개발자 도구에서 API 요청 확인
- [ ] CORS 오류 없음
- [ ] 모든 엔드포인트 정상 응답

---

## 🚨 문제 해결

### 일반적인 문제들

**1. 404 오류 (React 라우팅)**
- 해결: `_redirects` 파일 확인
- 내용: `/*    /index.html   200`

**2. CORS 오류**
- 해결: 백엔드 `CORS_ORIGIN` 환경변수 확인
- 프론트엔드 도메인이 포함되어 있는지 확인

**3. API 연결 실패**
- 해결: `REACT_APP_API_URL` 환경변수 확인
- 백엔드 URL이 올바른지 확인

**4. Supabase 인증 실패**
- 해결: Supabase Site URL 설정 확인
- 프론트엔드 도메인과 일치하는지 확인

---

## 📈 성능 최적화

배포 후 성능 향상을 위한 설정:

### 프론트엔드
```bash
# 빌드 최적화
GENERATE_SOURCEMAP=false
REACT_APP_NODE_ENV=production
```

### 백엔드
```bash
# 프로덕션 최적화
NODE_ENV=production
NPM_CONFIG_PRODUCTION=true
```

---

## 🔐 보안 설정

### 환경 변수 보안
- 민감한 정보는 Render 환경변수에만 저장
- GitHub에 `.env` 파일 푸시 금지
- Supabase 키 정기적 교체

### HTTPS 설정
- Render는 기본적으로 HTTPS 제공
- 커스텀 도메인 사용 시 SSL 인증서 자동 설정

---

이제 배포를 진행하시고, 각 단계별로 테스트해보세요!
문제가 발생하면 즉시 알려주시면 해결해드리겠습니다. 🎯 