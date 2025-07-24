# 🌤️ Cloudinary 설정 가이드

## 1️⃣ Cloudinary 계정 생성 (무료)

1. [Cloudinary 회원가입](https://cloudinary.com/users/register/free) 페이지로 이동
2. 이메일로 계정 생성 (또는 Google/GitHub 로그인)
3. 계정 생성 완료 후 대시보드 확인

## 2️⃣ API 키 확인

**Dashboard → Settings → API Keys**에서 다음 정보 확인:

```
Cloud Name: your-cloud-name
API Key: your-api-key  
API Secret: your-api-secret
```

## 3️⃣ 로컬 환경변수 설정

**backend/.env** 파일에 추가:

```env
# Cloudinary 설정
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 4️⃣ Render 환경변수 설정

**Render Dashboard → Your Service → Environment**에서 추가:

| Key | Value |
|-----|-------|
| `CLOUDINARY_CLOUD_NAME` | your-cloud-name |
| `CLOUDINARY_API_KEY` | your-api-key |
| `CLOUDINARY_API_SECRET` | your-api-secret |

## 5️⃣ 무료 플랜 제한

- **저장 용량**: 25GB
- **월 대역폭**: 25GB  
- **월 변환**: 25,000개
- **동영상**: 최대 10MB, 총 1GB

## 6️⃣ 폴더 구조

Cloudinary에서 자동 생성되는 폴더:

```
actscript/
├── profiles/     # 배우 프로필 이미지
├── community/    # 커뮤니티 게시글 이미지  
└── recruitments/ # 모집공고 이미지
```

## 7️⃣ 자동 최적화 기능

✅ **이미지 압축**: 자동으로 파일 크기 최적화  
✅ **포맷 변환**: 브라우저에 맞는 최적 포맷 제공  
✅ **리사이징**: 설정된 크기로 자동 조정  
✅ **CDN**: 전세계 빠른 이미지 로딩  

## 8️⃣ 테스트 방법

1. 서버 재시작: `npm start`
2. 배우 프로필에서 이미지 업로드 테스트
3. Cloudinary Dashboard에서 업로드 확인
4. 이미지가 빠르게 로딩되는지 확인

## 🚨 보안 주의사항

- ⚠️ **API Secret**은 절대 클라이언트에 노출하지 마세요
- ✅ 환경변수 파일(`.env`)을 Git에 커밋하지 마세요
- ✅ Render 환경변수는 안전하게 관리됩니다

## 🎯 설정 완료 확인

다음과 같이 작동하면 설정 완료:

1. 이미지 업로드 시 Cloudinary URL 반환
2. 이미지가 즉시 로딩됨  
3. 다양한 크기로 자동 최적화
4. 배포 후에도 이미지 유지

---

**문제 발생 시**: Cloudinary Dashboard의 **Media Library**에서 업로드된 이미지를 확인하세요.