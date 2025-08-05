# Supabase MCP 설정 스크립트 (PowerShell)
Write-Host "🚀 Supabase MCP 설정 스크립트" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 1단계: MCP 서버 설치
Write-Host "`n1단계: MCP Supabase 서버 설치 중..." -ForegroundColor Yellow
try {
    npm install -g @modelcontextprotocol/server-supabase
    Write-Host "✅ MCP 서버 설치 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ MCP 서버 설치 실패: $_" -ForegroundColor Red
    exit 1
}

# 2단계: 설정 파일 경로 확인
Write-Host "`n2단계: Claude Desktop 설정 파일 경로 확인..." -ForegroundColor Yellow
$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
Write-Host "설정 파일 경로: $configPath" -ForegroundColor Cyan

# 3단계: 디렉토리 생성 및 백업
Write-Host "`n3단계: 설정 준비..." -ForegroundColor Yellow
$claudeDir = "$env:APPDATA\Claude"
if (!(Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force
    Write-Host "Claude 디렉토리 생성 완료" -ForegroundColor Green
}

if (Test-Path $configPath) {
    Copy-Item $configPath "$configPath.backup"
    Write-Host "기존 설정 파일 백업 완료" -ForegroundColor Green
} else {
    Write-Host "새 설정 파일을 생성합니다" -ForegroundColor Green
}

# 4단계: 설정 파일 생성
Write-Host "`n4단계: MCP 설정 파일 생성..." -ForegroundColor Yellow
$config = @{
    mcpServers = @{
        supabase = @{
            command = "npx"
            args = @(
                "@modelcontextprotocol/server-supabase"
            )
            env = @{
                SUPABASE_URL = "https://stuaaylkugnbcedjjaei.supabase.co"
                SUPABASE_ANON_KEY = "sb_publishable_7CFf__fZBAqyLqIuYf6jqA_XnWes7Os"
            }
        }
    }
}

$configJson = $config | ConvertTo-Json -Depth 10
$configJson | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "✅ 설정 파일 생성 완료!" -ForegroundColor Green

# 5단계: 설정 검증
Write-Host "`n5단계: 설정 검증..." -ForegroundColor Yellow
try {
    $testConfig = Get-Content $configPath | ConvertFrom-Json
    Write-Host "✅ 설정 파일 형식 검증 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ 설정 파일 형식 오류: $_" -ForegroundColor Red
}

# 완료 메시지
Write-Host "`n🎉 MCP 설정 완료!" -ForegroundColor Green
Write-Host "`n다음 단계:" -ForegroundColor Yellow
Write-Host "1. Claude Desktop을 완전히 종료하세요" -ForegroundColor White
Write-Host "2. Claude Desktop을 다시 시작하세요" -ForegroundColor White
Write-Host "3. 'Supabase 테이블 목록을 보여줘'라고 물어보며 테스트하세요" -ForegroundColor White
Write-Host "`n설정 파일 위치: $configPath" -ForegroundColor Cyan

# 설정 파일 내용 표시
Write-Host "`n📄 생성된 설정 파일 내용:" -ForegroundColor Yellow
Get-Content $configPath | Write-Host -ForegroundColor Gray