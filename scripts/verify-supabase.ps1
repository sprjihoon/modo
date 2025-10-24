# Supabase 연결 검증 스크립트
# .env 파일의 Supabase 설정이 올바른지 확인

Write-Host "🔍 Supabase 연결 검증 중..." -ForegroundColor Green
Write-Host ""

# .env 파일 확인
if (!(Test-Path ".env")) {
    Write-Host "❌ .env 파일이 존재하지 않습니다!" -ForegroundColor Red
    Write-Host "   env.example을 복사하여 .env를 생성하세요" -ForegroundColor Yellow
    exit 1
}

# 환경변수 로드
$envContent = Get-Content .env
$supabaseUrl = ""
$supabaseAnonKey = ""

foreach ($line in $envContent) {
    if ($line -match "^SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1]
    }
    if ($line -match "^SUPABASE_ANON_KEY=(.+)") {
        $supabaseAnonKey = $matches[1]
    }
}

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "환경변수 확인" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# URL 검증
if ($supabaseUrl -eq "" -or $supabaseUrl -eq "https://your-project.supabase.co") {
    Write-Host "❌ SUPABASE_URL이 설정되지 않았습니다" -ForegroundColor Red
    Write-Host "   .env 파일에 실제 Supabase URL을 입력하세요" -ForegroundColor Yellow
    $urlValid = $false
} else {
    Write-Host "✅ SUPABASE_URL: $supabaseUrl" -ForegroundColor Green
    $urlValid = $true
}

# Key 검증
if ($supabaseAnonKey -eq "" -or $supabaseAnonKey -eq "your-anon-key-here") {
    Write-Host "❌ SUPABASE_ANON_KEY가 설정되지 않았습니다" -ForegroundColor Red
    Write-Host "   .env 파일에 실제 Supabase Anon Key를 입력하세요" -ForegroundColor Yellow
    $keyValid = $false
} else {
    Write-Host "✅ SUPABASE_ANON_KEY: $($supabaseAnonKey.Substring(0, 20))..." -ForegroundColor Green
    $keyValid = $true
}

Write-Host ""

if ($urlValid -and $keyValid) {
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Supabase API 연결 테스트" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    
    try {
        # REST API 엔드포인트 테스트
        $headers = @{
            "apikey" = $supabaseAnonKey
            "Authorization" = "Bearer $supabaseAnonKey"
        }
        
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/" -Headers $headers -Method Get -ErrorAction Stop
        
        Write-Host "✅ Supabase API 연결 성공!" -ForegroundColor Green
        Write-Host ""
        
        # 테이블 존재 확인 시도
        Write-Host "📊 데이터베이스 테이블 확인 중..." -ForegroundColor Cyan
        
        $tables = @("users", "orders", "shipments", "payments", "videos", "notifications")
        $foundTables = 0
        
        foreach ($table in $tables) {
            try {
                $testResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$table?limit=1" -Headers $headers -Method Get -ErrorAction SilentlyContinue
                Write-Host "  ✅ $table 테이블 존재" -ForegroundColor Green
                $foundTables++
            } catch {
                Write-Host "  ⚠️  $table 테이블 없음 또는 접근 불가" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "발견된 테이블: $foundTables / $($tables.Count)" -ForegroundColor Cyan
        
        if ($foundTables -eq $tables.Count) {
            Write-Host "✅ 모든 필수 테이블이 존재합니다!" -ForegroundColor Green
        } elseif ($foundTables -eq 0) {
            Write-Host "⚠️  테이블이 생성되지 않았습니다" -ForegroundColor Yellow
            Write-Host "   apps/sql/schema/ 폴더의 SQL 파일을 순서대로 실행하세요" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  일부 테이블이 누락되었습니다" -ForegroundColor Yellow
            Write-Host "   apps/sql/schema/ 폴더의 모든 SQL 파일을 확인하세요" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Supabase API 연결 실패" -ForegroundColor Red
        Write-Host "   에러: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "확인사항:" -ForegroundColor Yellow
        Write-Host "  1. Supabase URL이 올바른지 확인" -ForegroundColor Yellow
        Write-Host "  2. Anon Key가 올바른지 확인" -ForegroundColor Yellow
        Write-Host "  3. Supabase 프로젝트가 활성화되어 있는지 확인" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env 파일을 올바르게 설정한 후 다시 실행하세요" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "검증 완료" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "  1. Supabase Dashboard에서 SQL Editor 열기" -ForegroundColor Cyan
Write-Host "  2. apps/sql/schema/01_users.sql ~ 06_notifications.sql 순서대로 실행" -ForegroundColor Cyan
Write-Host "  3. .\scripts\check-schema.ps1 로 스키마 검증" -ForegroundColor Cyan
Write-Host ""

