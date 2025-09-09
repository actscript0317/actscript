# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code (claude.ai/code)에게 가이드라인을 제공합니다.

## 프로젝트 개요

**연기 대본 라이브러리 (Acting Scripts Library)** - AI 기반 연기 대본 생성과 커뮤니티 기능을 제공하는 한국어 웹 플랫폼입니다. React 프론트엔드와 Express 백엔드를 사용하며, 데이터 저장을 위한 Supabase와 대본 생성을 위한 OpenAI가 통합되어 있습니다.

## 아키텍처

### 기술 스택
- **프론트엔드**: React 18, Tailwind CSS, React Router, Framer Motion
- **백엔드**: Express.js, Supabase (MongoDB 대체), JWT 인증
- **AI 통합**: 대본 생성을 위한 OpenAI API
- **파일 저장**: 이미지를 위한 Cloudinary
- **배포**: Render (프론트엔드 + 백엔드)
- **결제**: NicePay 통합

### 데이터베이스 마이그레이션 현황
프로젝트는 **MongoDB에서 Supabase로 활발히 마이그레이션** 중입니다. Supabase 라우트가 현재 구현입니다:
- ✅ `supabase-auth.js` - Mailgun 이메일 인증 포함 인증
- ✅ `supabase-actor-profiles.js` - 배우 프로필 관리  
- ✅ `supabase-community-posts.js` - 커뮤니티 게시물 및 상호작용
- ✅ `supabase-bookmarks.js` - 사용자 북마크
- ✅ `supabase-admin.js` - 사용량 추적이 있는 관리자 사용자 관리

## 개발 명령어

### 풀 스택 개발
```bash
# 프론트엔드와 백엔드를 동시에 시작
npm run dev

# 백엔드만 시작
npm run server
# 또는
cd backend && npm run dev

# 프론트엔드만 시작  
npm run client
# 또는
cd frontend && npm run start:dev
```

### 프론트엔드 명령어
```bash
cd frontend

# 개발 서버
npm run start:dev

# 프로덕션 빌드
npm run build

# 테스트
npm test
npm run test:coverage

# 린팅
npm run lint
npm run lint:fix

# 프로덕션 빌드 서빙
npm run serve
```

### 백엔드 명령어
```bash
cd backend

# nodemon으로 개발
npm run dev

# 프로덕션
npm start

# 관리자 유틸리티
npm run create-admin
npm run get-admin-token  
npm run manage-users
```

## 핵심 파일 구조

### 백엔드 라우트 구조
```
backend/routes/
├── ai-script/                 # AI 대본 생성 (전문 라우트)
│   ├── children-theater.js    # 아동극 대본
│   ├── custom-script.js       # 커스텀 대본 생성
│   ├── general-script.js      # 일반 연기 대본
│   └── index.js              # 메인 AI 대본 라우터
├── supabase-auth.js          # Mailgun 이메일 인증  
├── supabase-actor-profiles.js # 배우 프로필 CRUD
├── supabase-community-posts.js # 커뮤니티 기능
├── supabase-admin.js         # 관리자 사용자 관리
└── [기존 MongoDB 라우트]      # 단계적 폐지 중
```

### 프론트엔드 페이지 구조
```
frontend/src/pages/
├── ai-script/                # AI 대본 생성 페이지
│   └── AnimalSelection.js    # 동물 캐릭터 선택
├── comunity/                 # 커뮤니티 페이지
│   ├── ActorProfile.js       # 배우 프로필 표시
│   ├── ActorRecruitment.js   # 모집 공고
│   └── CreatePost.js         # 게시물 작성
├── AIScript.js               # 메인 AI 대본 인터페이스
├── GeneralScript.js          # 일반 대본 생성
└── MyPage.js                 # 사용량 추적이 있는 사용자 대시보드
```

## 환경 설정

### 필수 환경 변수

**백엔드 (.env)**:
```env
# Supabase (주 데이터베이스)
SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# JWT 설정
JWT_SECRET=actscript_jwt_secret_key_2025_secure_token
JWT_EXPIRE=7d

# OpenAI 통합
OPENAI_API_KEY=[AI 대본 생성에 필요]

# Cloudinary 이미지 저장
CLOUDINARY_CLOUD_NAME=[your-cloud-name]
CLOUDINARY_API_KEY=[your-api-key]
CLOUDINARY_API_SECRET=[your-api-secret]

# 이메일 서비스 (Mailgun)
MAILGUN_API_KEY=[회원가입 인증에 필요]

# 결제 통합
NICEPAY_CLIENT_KEY=[결제 처리용]

# 서버 설정
NODE_ENV=development
PORT=10000
CLIENT_URL=http://localhost:3000
```

**프론트엔드 (.env)**:
```env
REACT_APP_API_URL=http://localhost:10000/api
REACT_APP_SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_...
```

## 핵심 기능 구현

### AI 대본 생성 시스템
- **전문 라우트**: 아동극, 커스텀 대본, 일반 연기를 위한 다양한 AI 모델
- **사용량 추적**: 관리자 재정의 기능이 있는 사용자별 월 한도
- **대본 카테고리**: 감정 기반 분류 시스템

### 인증 플로우
- **이메일 인증**: 회원가입 완료를 위한 Mailgun 통합
- **JWT 토큰**: 새로고침 기능이 있는 7일 만료  
- **관리자 시스템**: 사용자 관리를 포함한 별도 관리자 인증

### 사용자 관리 시스템
- **사용량 제한**: 설정 가능한 월별 대본 생성 한도
- **구독 등급**: 무료 (월 10회) 및 프리미엄 (무제한)
- **관리자 대시보드**: 사용량 분석을 포함한 전체 사용자 관리

## 일반적인 개발 작업

### 새로운 AI 대본 템플릿릿 추가
1. `backend/routes/ai-script/[script-type].js`에 라우트 생성
2. `frontend/src/pages/ai-script/[ScriptType].js`에 프론트엔드 페이지 추가
3. `backend/routes/ai-script/index.js`에서 메인 라우터 업데이트
4. `frontend/src/App.js`에 네비게이션 링크 추가

### 데이터베이스 작업
- **새로운 기능에는 Supabase 라우트 사용**
- **기존 MongoDB 라우트**는 단계적 폐지 중
- **관리자 작업**은 사용자 관리를 위해 `supabase-admin.js` 사용

### 인증 테스트
```bash
# 관리자 사용자 생성
cd backend && npm run create-admin

# API 테스트를 위한 관리자 토큰 받기
npm run get-admin-token

# curl로 테스트
curl -H "Authorization: Bearer [token]" http://localhost:10000/api/admin/users
```

### 배포 프로세스
프로젝트는 `render.yaml`의 설정으로 Render를 사용합니다:
- **프론트엔드**: `/frontend/build`에서 정적 사이트 배포
- **백엔드**: `/backend`에서 Node.js 서비스
- **환경**: Render 대시보드에서 설정된 프로덕션 변수

## 중요 사항

### 데이터베이스 마이그레이션 현황
- **활성 마이그레이션**: MongoDB → Supabase 진행 중
- **Supabase 라우트 사용**: 모든 새로운 개발에
- **기존 라우트**: MongoDB 라우트 사용 금지 (제거 예정)

### AI 통합
- **OpenAI 의존성**: 핵심 기능에 유효한 API 키 필요
- **사용량 모니터링**: 비용 관리를 위한 내장 추적
- **속도 제한**: 사용자별 및 전체적으로 구현됨

### 보안 고려사항
- **서비스 역할 키**: 백엔드는 Supabase 비밀 키 사용 (sb_secret_)
- **클라이언트 키**: 프론트엔드는 공개 키 사용 (sb_publishable_)
- **JWT 비밀**: 안전하게 보관하고 정기적으로 교체
- **관리자 접근**: 높은 권한을 가진 별도 인증 플로우

### 한국어 지원
- **UI 텍스트**: 한국어/영어 혼합 인터페이스
- **대본 내용**: AI가 한국어 연기 대본 생성
- **사용자 커뮤니케이션**: 한국어로 된 오류 메시지 및 알림

## 문제 해결

### 일반적인 문제
- **500 오류**: 보통 Supabase 서비스 역할 키 설정 오류
- **인증 실패**: JWT 비밀 및 Supabase 키 확인
- **파일 업로드 문제**: Cloudinary 설정 확인
- **AI 생성 실패**: OpenAI API 키 및 사용량 한도 검증

### 디버그 모드
백엔드 환경에서 `NODE_ENV=development` 설정으로 상세한 로깅 활성화.