# DB 스키마 검사 스크립트
# apps/sql/schema/01~06이 순서대로 반영되었는지 확인

Write-Host "📋 데이터베이스 스키마 검사 중..." -ForegroundColor Green
Write-Host ""

# .env 파일에서 Supabase 정보 로드
if (!(Test-Path ".env")) {
    Write-Host "❌ .env 파일이 없습니다!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content .env
$supabaseUrl = ""
$supabaseKey = ""

foreach ($line in $envContent) {
    if ($line -match "^SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1]
    }
    if ($line -match "^SUPABASE_ANON_KEY=(.+)") {
        $supabaseKey = $matches[1]
    }
}

if ($supabaseUrl -eq "" -or $supabaseUrl -eq "https://your-project.supabase.co") {
    Write-Host "❌ Supabase URL이 설정되지 않았습니다" -ForegroundColor Red
    Write-Host "   먼저 .\scripts\verify-supabase.ps1을 실행하세요" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "필수 테이블 검사" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 검사할 테이블 정의 (순서대로)
$requiredTables = @(
    @{Name="users"; Schema="01_users.sql"; Description="고객 프로필"},
    @{Name="orders"; Schema="02_orders.sql"; Description="주문"},
    @{Name="shipments"; Schema="03_shipments.sql"; Description="송장/배송"},
    @{Name="payments"; Schema="04_payments.sql"; Description="결제"},
    @{Name="videos"; Schema="05_videos.sql"; Description="영상"},
    @{Name="notifications"; Schema="06_notifications.sql"; Description="알림"}
)

$allTablesExist = $true
$tableResults = @()

foreach ($table in $requiredTables) {
    Write-Host "검사 중: $($table.Name) ($($table.Description))..." -NoNewline
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$supabaseUrl/rest/v1/$($table.Name)?limit=0" `
            -Headers $headers `
            -Method Get `
            -ErrorAction Stop
        
        Write-Host " ✅" -ForegroundColor Green
        $tableResults += @{
            Name = $table.Name
            Schema = $table.Schema
            Exists = $true
            Status = "OK"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 404) {
            Write-Host " ❌ (테이블 없음)" -ForegroundColor Red
            $allTablesExist = $false
            $tableResults += @{
                Name = $table.Name
                Schema = $table.Schema
                Exists = $false
                Status = "NOT_FOUND"
            }
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host " ⚠️  (권한 없음 - RLS 확인 필요)" -ForegroundColor Yellow
            $tableResults += @{
                Name = $table.Name
                Schema = $table.Schema
                Exists = $true
                Status = "NO_ACCESS"
            }
        } else {
            Write-Host " ⚠️  (알 수 없는 에러: $statusCode)" -ForegroundColor Yellow
            $tableResults += @{
                Name = $table.Name
                Schema = $table.Schema
                Exists = $false
                Status = "ERROR"
            }
        }
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "검사 결과 요약" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$existCount = ($tableResults | Where-Object { $_.Exists -eq $true }).Count
$totalCount = $tableResults.Count

Write-Host "테이블 상태: $existCount / $totalCount" -ForegroundColor Cyan
Write-Host ""

# 상세 결과
foreach ($result in $tableResults) {
    $icon = if ($result.Exists) { "✅" } else { "❌" }
    $color = if ($result.Exists) { "Green" } else { "Red" }
    
    Write-Host "$icon $($result.Name)" -ForegroundColor $color
    Write-Host "   스키마: apps/sql/schema/$($result.Schema)" -ForegroundColor Gray
    
    if ($result.Status -eq "NO_ACCESS") {
        Write-Host "   상태: RLS로 인한 접근 제한 (정상)" -ForegroundColor Yellow
    } elseif ($result.Status -eq "NOT_FOUND") {
        Write-Host "   상태: 테이블 없음 - SQL 파일 실행 필요" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

if ($existCount -eq $totalCount) {
    Write-Host "✅ 모든 테이블이 정상적으로 생성되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Yellow
    Write-Host "  1. 관리자 계정 생성: admin@admin.modusrepair.com" -ForegroundColor Cyan
    Write-Host "  2. Edge Functions 테스트: .\scripts\test-apis.ps1" -ForegroundColor Cyan
    Write-Host "  3. Admin/Mobile 앱 실행" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  누락된 테이블이 있습니다" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "해결 방법:" -ForegroundColor Yellow
    Write-Host "  1. Supabase Dashboard → SQL Editor 열기" -ForegroundColor Cyan
    Write-Host "  2. 누락된 스키마 파일을 순서대로 실행:" -ForegroundColor Cyan
    
    foreach ($result in $tableResults) {
        if (-not $result.Exists) {
            Write-Host "     - apps/sql/schema/$($result.Schema)" -ForegroundColor Red
        }
    }
    
    Write-Host "  3. 다시 이 스크립트 실행: .\scripts\check-schema.ps1" -ForegroundColor Cyan
}

Write-Host ""

