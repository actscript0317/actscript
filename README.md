# 연기 대본 라이브러리

Node.js, React, MongoDB를 사용한 연기 대본 수집 및 제공 웹사이트입니다.

## 🛠 기술 스택

- **프론트엔드**: React 18 + Tailwind CSS
- **백엔드**: Node.js + Express.js  
- **데이터베이스**: MongoDB + Mongoose
- **패키지 매니저**: npm
- **상태 관리**: React Query
- **라우팅**: React Router
- **아이콘**: Lucide React

## ✨ 기능

- 다양한 연기 대본(감정 대사)을 분류해서 제공
- 사용자가 대본을 검색하거나 감정/인물 수/장르로 필터링
- 대본 상세 페이지에서 관련 대본 추천
- 관리자용 대본 등록 기능
- 반응형 웹 디자인 (모바일/태블릿/데스크탑)

## 🚀 설치 및 실행

### 1. 필요 사항

- Node.js 16.x 이상
- MongoDB 4.4 이상
- npm 또는 yarn

### 2. MongoDB 설치

#### Windows:
1. [MongoDB Community Server](https://www.mongodb.com/try/download/community) 다운로드
2. 설치 후 MongoDB 서비스 시작
3. 기본 포트: 27017

#### macOS (Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Ubuntu/Linux:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### 3. 프로젝트 설정

1. 저장소 클론:
```bash
git clone <repository-url>
cd acting-scripts
```

2. 백엔드 설정:
```bash
cd backend
npm install

# .env 파일 생성
echo "PORT=5000
MONGODB_URI=mongodb://localhost:27017/acting_scripts
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
OPENAI_API_KEY=your-actual-openai-api-key-here" > .env
```

**⚠️ 중요**: `.env` 파일에는 실제 API 키와 비밀키를 입력해야 합니다. 이 파일은 Git에 커밋되지 않습니다.

### 환경 변수 설정 상세 가이드:

1. **OpenAI API 키 설정**:
   - [OpenAI API 키 발급](https://platform.openai.com/api-keys)에서 키를 발급받으세요
   - `.env` 파일의 `OPENAI_API_KEY`에 실제 키를 입력하세요

2. **JWT 시크릿 설정**:
   - `JWT_SECRET`에는 강력한 랜덤 문자열을 사용하세요
   - 예: `JWT_SECRET=my-super-secret-jwt-key-2024-production`

3. **데이터베이스 설정**:
   - 로컬 MongoDB: `MONGODB_URI=mongodb://localhost:27017/acting_scripts`
   - MongoDB Atlas: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/acting_scripts`

4. **프로덕션 환경**:
   - `NODE_ENV=production`
   - `CORS_ORIGIN`을 실제 도메인으로 설정

3. 프론트엔드 설정:
```bash
cd frontend
npm install
```

### 4. 실행

1. 백엔드 서버 실행:
```bash
cd backend
npm run dev  # 개발 모드 (nodemon)
# 또는
npm start    # 프로덕션 모드
```

2. 프론트엔드 서버 실행 (새 터미널):
```bash
cd frontend
npm start
```

### 5. 접속

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5000

## 📁 프로젝트 구조

```
acting-scripts/
├── backend/                 # Node.js 백엔드
│   ├── config/             # 데이터베이스 설정
│   ├── models/             # Mongoose 스키마
│   ├── routes/             # API 라우트
│   ├── server.js           # 메인 서버 파일
│   └── package.json
├── frontend/               # React 프론트엔드
│   ├── public/            # 정적 파일
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스
│   │   └── App.js         # 메인 앱 컴포넌트
│   └── package.json
└── README.md
```

## 🔗 API 엔드포인트

### 대본 API
- `GET /api/scripts` - 모든 대본 조회 (필터링, 페이지네이션)
- `GET /api/scripts/popular` - 인기 대본 조회
- `GET /api/scripts/latest` - 최신 대본 조회
- `GET /api/scripts/:id` - 특정 대본 조회
- `POST /api/scripts` - 대본 생성
- `PUT /api/scripts/:id` - 대본 수정
- `DELETE /api/scripts/:id` - 대본 삭제

### 감정 API
- `GET /api/emotions` - 모든 감정 조회
- `POST /api/emotions` - 감정 생성
- `PUT /api/emotions/:id` - 감정 수정
- `DELETE /api/emotions/:id` - 감정 삭제

## 📊 데이터베이스 구조

### Scripts Collection
```json
{
  "_id": "ObjectId",
  "title": "대본 제목",
  "characterCount": 2,
  "situation": "상황 설명",
  "content": "대본 내용",
  "emotions": ["기쁨", "사랑"],
  "views": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Emotions Collection
```json
{
  "_id": "ObjectId",
  "name": "감정이름",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 🛠 개발 도구

- **백엔드 개발 서버**: `npm run dev` (nodemon 사용)
- **프론트엔드 개발 서버**: `npm start` (hot reload)
- **프로덕션 빌드**: `npm run build`

## 🐛 문제 해결

### MongoDB 연결 오류:
1. MongoDB 서비스가 실행 중인지 확인
2. 포트 27017이 열려있는지 확인
3. .env 파일의 MONGODB_URI 확인

### 포트 충돌:
1. 다른 애플리케이션이 포트를 사용중인지 확인
2. .env 파일에서 PORT 변경
3. 프론트엔드 proxy 설정 확인

### 패키지 설치 오류:
```bash
# 캐시 정리 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Render 배포 가이드

### 백엔드 배포 (Render):

1. **새 Web Service 생성**:
   - Render 대시보드에서 "New Web Service" 선택
   - GitHub 저장소 연결

2. **환경 변수 설정**:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your-mongodb-atlas-uri
   JWT_SECRET=your-production-jwt-secret
   JWT_EXPIRE=7d
   OPENAI_API_KEY=your-openai-api-key
   CORS_ORIGIN=https://your-frontend-domain.onrender.com
   ```

3. **빌드 설정**:
   - Build Command: `npm install`
   - Start Command: `npm start`

### 프론트엔드 배포 (Render):

1. **새 Static Site 생성**:
   - Render 대시보드에서 "New Static Site" 선택
   - GitHub 저장소 연결

2. **빌드 설정**:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`

3. **환경 변수 설정**:
   ```
   REACT_APP_API_URL=https://your-backend-service.onrender.com/api
   ```

### 보안 주의사항:

- ✅ `.env` 파일은 절대 Git에 커밋하지 마세요
- ✅ 프로덕션에서는 강력한 JWT 시크릿을 사용하세요
- ✅ CORS 설정을 실제 도메인으로 제한하세요
- ✅ MongoDB Atlas 사용을 권장합니다

## 📝 라이센스

MIT License 