# 🚨 긴급: 백엔드 500 오류 수정

## 현재 문제
```
❌ POST /api/auth/complete-signup → 500 Internal Server Error
❌ 프로필 생성 실패
```

## 원인 분석
백엔드에서 Supabase Service Role Key가 설정되지 않아 토큰 검증 실패

---

## 🛠️ 즉시 해결 방법

### 1. 백엔드 Render 환경변수 설정

#### 백엔드 서비스 찾기:
- **actscript-1** (현재 서비스) 또는
- **actscript-backend** (별도 백엔드 서비스)

#### 설정해야 할 환경변수:
```
SUPABASE_URL=https://stuaaylkugnbcedjjaei.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_PVaJigblcBi1ixYfFGGlJw_1_6ktIDn
SUPABASE_ANON_KEY=sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os
```

⚠️ **중요**: 백엔드에서는 **Secret Key** (`sb_secret_`)를 사용해야 합니다!

### 2. 환경변수 설정 절차

1. **Render Dashboard** 접속
2. **백엔드 서비스** 클릭 (actscript-1 또는 actscript-backend)
3. **Environment** 탭 클릭
4. **위 환경변수들 추가/수정**
5. **Save** 클릭

### 3. 재배포 대기
- 환경변수 저장 후 자동 재배포
- 3-5분 대기

---

## 🔧 디버깅을 위한 임시 수정

백엔드 로그를 더 자세히 보기 위해 임시 수정:

### complete-signup 엔드포인트에 로그 추가:
```javascript
// 토큰 검증 전에 추가
console.log('🔧 토큰 검증 시작:', token.substring(0, 20) + '...');
console.log('🔧 Supabase Service Key 존재:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
```

---

## 🎯 테스트 절차

### 1. 환경변수 설정 후
1. **Render 재배포 완료 대기**
2. **새 이메일로 회원가입**
3. **이메일 링크 클릭**
4. **브라우저 콘솔 확인**

### 2. 성공 시 예상 로그
```
✅ 📝 회원가입 완료 처리: {userId: "...", email: "...", username: "...", name: "..."}
✅ 🔧 토큰 검증 시작: eyJhbGciOiJIUzI1NiIs...
✅ 🔧 Supabase Service Key 존재: true
✅ ✅ 토큰 검증 완료: user@email.com
✅ ✅ 회원가입 완료: {id: "...", username: "...", email: "..."}
```

### 3. 프론트엔드 성공 로그
```
✅ 📥 백엔드 응답 상태: 200 OK
✅ 📥 백엔드 응답 데이터: {success: true, message: "회원가입이 완료되었습니다."}
✅ ✅ 프로필 생성 완료
```

---

## 💡 추가 확인사항

### API 키 체계 정리:
- **프론트엔드**: `sb_publishable_...` (Publishable Key)
- **백엔드**: `sb_secret_...` (Secret Key)

### 권한 차이:
- **Publishable**: 제한된 권한, 브라우저 안전
- **Secret**: 전체 권한, 서버에서만 사용

---

## 🚀 최종 체크리스트

- [ ] 백엔드 `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] 백엔드 `SUPABASE_URL` 설정  
- [ ] Render 재배포 완료
- [ ] 회원가입 테스트 성공
- [ ] 로그인 테스트 성공

**백엔드 환경변수 설정이 핵심입니다!** 🎯 