# 관리자 사용자 사용량 관리 가이드

## 📋 개요
이 가이드는 관리자가 사용자의 AI 대본 생성 사용량 제한을 조절하는 방법을 설명합니다.

## 🔐 인증
모든 관리자 API는 관리자 권한이 필요합니다. 요청 헤더에 관리자 토큰을 포함해야 합니다.

```
Authorization: Bearer <관리자_토큰>
```

## 🚀 API 엔드포인트

### 1. 사용자 목록 조회
```
GET /api/admin/users?page=1&limit=20&search=검색어
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "username": "testuser",
        "email": "test@example.com",
        "name": "테스트 사용자",
        "subscription": "free",
        "usage": {
          "currentMonth": 5,
          "monthly_limit": 10,
          "totalGenerated": 15
        },
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2. 특정 사용자 정보 조회
```
GET /api/admin/users/:userId
```

### 3. 사용자 사용량 제한 변경 ⭐
```
PUT /api/admin/users/:userId/usage-limit
Content-Type: application/json

{
  "monthly_limit": 50
}
```

**사용 가능한 값:**
- `1-1000`: 해당 숫자만큼 월간 사용 제한
- `999999`: 무제한 사용 (프리미엄 계정으로 자동 변경)

**응답 예시:**
```json
{
  "success": true,
  "message": "사용자의 월간 사용량이 50회로 변경되었습니다.",
  "data": {
    "id": "user-uuid",
    "usage": {
      "currentMonth": 5,
      "monthly_limit": 50,
      "totalGenerated": 15
    },
    "subscription": "free"
  }
}
```

### 4. 사용자 사용량 초기화
```
PUT /api/admin/users/:userId/reset-usage
```

**응답 예시:**
```json
{
  "success": true,
  "message": "사용자의 이번 달 사용량이 초기화되었습니다."
}
```

## 💻 사용 예시 (curl)

### 사용자 목록 조회
```bash
curl -X GET \
  "http://localhost:5000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 사용량 제한 변경 (20회로 설정)
```bash
curl -X PUT \
  "http://localhost:5000/api/admin/users/USER_UUID/usage-limit" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monthly_limit": 20}'
```

### 무제한 사용자로 변경
```bash
curl -X PUT \
  "http://localhost:5000/api/admin/users/USER_UUID/usage-limit" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monthly_limit": 999999}'
```

### 사용량 초기화
```bash
curl -X PUT \
  "http://localhost:5000/api/admin/users/USER_UUID/reset-usage" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🎯 일반적인 사용 시나리오

### 1. 베타 테스터에게 더 많은 사용량 제공
1. 사용자 목록에서 해당 사용자 ID 찾기
2. `PUT /api/admin/users/:userId/usage-limit`로 제한 증가
3. 예: 월 50회로 변경

### 2. VIP 사용자에게 무제한 제공
1. `{"monthly_limit": 999999}` 설정
2. 자동으로 subscription이 "premium"으로 변경됨

### 3. 사용량 초과 사용자 초기화
1. `PUT /api/admin/users/:userId/reset-usage`로 이번 달 사용량 0으로 리셋

## 📊 현재 시스템 설정

### 기본 제한
- **신규 사용자**: 월 10회
- **기본 플랜**: "free"
- **무제한 사용자**: "premium" 플랜으로 자동 변경

### 플랜 종류
- `free`: 제한된 사용량 (기본 10회)
- `premium`: 무제한 사용량 (999999로 설정된 사용자)

## ⚠️ 주의사항

1. **관리자 권한 필요**: 모든 API는 관리자 토큰이 필요합니다.
2. **즉시 적용**: 변경사항은 즉시 적용되며, 사용자가 다음 대본 생성 시 반영됩니다.
3. **데이터 백업**: 중요한 변경 전에는 데이터를 백업하는 것을 권장합니다.
4. **사용량 모니터링**: 무제한 사용자가 과도하게 API를 사용하지 않는지 모니터링이 필요합니다.

## 🔧 문제 해결

### API 호출 시 401 오류
- 관리자 토큰이 올바른지 확인
- 토큰이 만료되지 않았는지 확인

### 404 오류 (사용자 없음)
- 사용자 ID가 올바른지 확인
- 사용자가 실제로 존재하는지 확인

### 400 오류 (잘못된 제한값)
- monthly_limit 값이 1-1000 또는 999999 범위인지 확인