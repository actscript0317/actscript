# MongoDB Atlas 연결 문제 해결 가이드

## 현재 상황
- 인터넷 연결: ✅ 정상
- MongoDB Atlas 연결: ❌ 실패 (`EREFUSED` 오류)

## 해결 방법

### 1. MongoDB Atlas 설정 확인

#### IP 화이트리스트 확인
1. https://cloud.mongodb.com 접속
2. Security → Network Access
3. 현재 IP 주소가 추가되어 있는지 확인
4. 없다면 "ADD IP ADDRESS" 클릭
5. "Add Current IP Address" 선택

#### 클러스터 상태 확인
1. Clusters 메뉴에서 클러스터 상태 확인
2. 상태가 "Available"인지 확인
3. 일시 중지 중이라면 "Resume" 클릭

### 2. 네트워크 설정 확인

#### DNS 서버 변경
1. 네트워크 설정 → 어댑터 옵션 변경
2. 사용 중인 네트워크 → 속성
3. "인터넷 프로토콜 버전 4" → 속성
4. DNS 서버 주소 수동 설정:
   - 기본 설정 DNS 서버: `8.8.8.8`
   - 보조 DNS 서버: `8.8.4.4`

#### 명령 프롬프트에서 DNS 캐시 삭제
```cmd
ipconfig /flushdns
```

### 3. 방화벽 확인

#### Windows Defender 방화벽
1. 제어판 → 시스템 및 보안 → Windows Defender 방화벽
2. "앱 또는 기능이 Windows Defender 방화벽을 통과하도록 허용"
3. Node.js가 허용되어 있는지 확인

#### 회사/기관 방화벽
- 회사나 기관 네트워크를 사용 중이라면 IT 관리자에게 MongoDB Atlas 접속 허용 요청

### 4. VPN 확인
- VPN 사용 중이라면 일시적으로 비활성화 후 재시도

### 5. 대체 연결 방법

#### MongoDB Compass 사용
1. MongoDB Compass 설치
2. 연결 문자열 입력:
   ```
   mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript
   ```
3. 연결 테스트 후 관리자 계정 수동 생성

### 6. 관리자 계정 수동 생성

위의 방법들로 연결이 안 된다면:

1. **MongoDB Atlas 웹에서 직접 생성** (추천)
   - 위에서 제공된 JSON 문서 사용

2. **서버 배포 후 생성**
   - 서버가 배포된 환경에서 스크립트 실행
   - Render 등의 서버 환경에서는 연결이 될 수 있음

## 테스트 명령어

```bash
# 연결 테스트
node scripts/testConnection.js

# 관리자 계정 생성 (연결 성공 시)
npm run create-admin

# 오프라인 모드 (수동 생성용 정보)
node scripts/createAdminOffline.js
```

## 생성된 관리자 계정 정보

- **사용자명**: `admin`
- **이메일**: `admin@actscript.com`
- **비밀번호**: `ActScript2024!@#`
- **권한**: `admin`

⚠️ **보안 주의**: 최초 로그인 후 반드시 비밀번호를 변경하세요!