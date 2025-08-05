@echo off
echo 🚀 Supabase MCP 설정 스크립트
echo ================================

echo 1단계: MCP Supabase 서버 설치 중...
npm install -g @modelcontextprotocol/server-supabase

echo.
echo 2단계: Claude Desktop 설정 파일 경로 확인...
set CONFIG_PATH=%APPDATA%\Claude\claude_desktop_config.json
echo 설정 파일 경로: %CONFIG_PATH%

echo.
echo 3단계: 설정 파일 백업 생성...
if exist "%CONFIG_PATH%" (
    copy "%CONFIG_PATH%" "%CONFIG_PATH%.backup"
    echo 기존 설정 파일 백업 완료
) else (
    echo 기존 설정 파일이 없습니다. 새로 생성합니다.
    if not exist "%APPDATA%\Claude" mkdir "%APPDATA%\Claude"
)

echo.
echo 4단계: 새 설정 파일 생성...
(
echo {
echo   "mcpServers": {
echo     "supabase": {
echo       "command": "npx",
echo       "args": [
echo         "@modelcontextprotocol/server-supabase"
echo       ],
echo       "env": {
echo         "SUPABASE_URL": "https://stuaaylkugnbcedjjaei.supabase.co",
echo         "SUPABASE_ANON_KEY": "sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os"
echo       }
echo     }
echo   }
echo }
) > "%CONFIG_PATH%"

echo.
echo ✅ 설정 완료!
echo.
echo 다음 단계:
echo 1. Claude Desktop을 완전히 종료하세요
echo 2. Claude Desktop을 다시 시작하세요
echo 3. "Supabase 테이블 목록을 보여줘"라고 물어보며 테스트하세요
echo.
echo 설정 파일 위치: %CONFIG_PATH%
echo.
pause