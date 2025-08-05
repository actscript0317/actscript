# Supabase MCP 연동 가이드

## 🚀 자동 설정 스크립트 실행

### 방법 1: 배치 파일 실행
```bash
# 관리자 권한으로 실행
setup-mcp.bat
```

### 방법 2: PowerShell 스크립트 실행
```powershell
# PowerShell을 관리자 권한으로 열고 실행
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-mcp.ps1
```

## 🔧 수동 설정 방법

### 1단계: MCP 서버 설치
```bash
npm install -g @modelcontextprotocol/server-supabase
```

### 2단계: Claude Desktop 설정 파일 수정
파일 위치: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://stuaaylkugnbcedjjaei.supabase.co",
        "SUPABASE_ANON_KEY": "sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os"
      }
    }
  }
}
```

### 3단계: Claude Desktop 재시작
1. Claude Desktop 완전 종료
2. 다시 시작

## 🧪 테스트 명령어들

MCP 연동 확인을 위한 테스트 명령어들:

```
1. "Supabase 연결 상태를 확인해줘"
2. "데이터베이스 테이블 목록을 보여줘"
3. "users 테이블의 구조를 알려줘"
4. "scripts 테이블에서 최근 5개 데이터를 보여줘"
5. "emotions 테이블의 모든 감정을 나열해줘"
```

## 🔍 문제 해결

### 연동이 안 될 때 체크리스트

1. **Node.js 설치 확인**:
   ```bash
   node --version
   npm --version
   ```

2. **MCP 서버 설치 확인**:
   ```bash
   npm list -g @modelcontextprotocol/server-supabase
   ```

3. **설정 파일 경로 확인**:
   ```bash
   echo %APPDATA%\Claude\claude_desktop_config.json
   ```

4. **JSON 문법 검증**:
   - [JSONLint](https://jsonlint.com/)에서 설정 파일 검증

5. **Supabase 연결 테스트**:
   ```bash
   curl -H "apikey: sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os" ^
        "https://stuaaylkugnbcedjjaei.supabase.co/rest/v1/"
   ```

### 일반적인 오류들

#### 1. "command not found" 에러
- Node.js가 설치되지 않았거나 PATH에 없음
- 해결: Node.js 재설치 또는 PATH 설정

#### 2. "Permission denied" 에러
- 관리자 권한 필요
- 해결: 관리자 권한으로 명령 프롬프트 실행

#### 3. "Invalid JSON" 에러
- 설정 파일 문법 오류
- 해결: JSON 형식 확인 및 수정

#### 4. "Connection refused" 에러
- Supabase URL 또는 키 오류
- 해결: URL과 키 재확인

## 📊 연동 후 활용 예시

### 데이터 조회
```
"scripts 테이블에서 조회수가 100 이상인 스크립트들을 보여줘"
```

### 데이터 분석
```
"사용자별 스크립트 작성 통계를 보여줘"
```

### 데이터 수정
```
"user_id가 123인 사용자의 이름을 '새이름'으로 변경해줘"
```

### 실시간 모니터링
```
"최근 1시간 동안 새로 등록된 스크립트 수는?"
```

## 🔐 보안 고려사항

1. **키 관리**:
   - Anon Key만 사용 (Service Role Key는 필요시에만)
   - 키가 노출되지 않도록 주의

2. **RLS 정책**:
   - Supabase에서 적절한 Row Level Security 정책 설정
   - 필요한 최소 권한만 부여

3. **네트워크 보안**:
   - HTTPS 연결 확인
   - 방화벽 설정 확인

## 📞 지원

문제가 발생하면 다음 정보와 함께 문의하세요:
- 운영체제 정보
- Node.js 버전
- 에러 메시지 전문
- 설정 파일 내용 (키 제외)