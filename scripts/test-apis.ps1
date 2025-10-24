# API 스모크 테스트 스크립트
# Edge Functions가 실행 중이어야 합니다

$baseUrl = "http://localhost:54321/functions/v1"
$anonKey = "YOUR_ANON_KEY_HERE"  # .env에서 가져온 키로 변경

Write-Host "🧪 API 스모크 테스트를 시작합니다..." -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host ""

# 테스트 데이터
$testOrderId = "ORD-TEST-" + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1️⃣  결제 검증 API 테스트" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

$paymentBody = @{
    order_id = $testOrderId
    amount = 36000
    pg_tid = "T" + (Get-Random -Maximum 999999)
    imp_uid = "imp_" + (Get-Random -Maximum 999999999)
    merchant_uid = "merchant_" + (Get-Random -Maximum 999999999)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/payments-verify" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $anonKey"
        } `
        -Body $paymentBody
    
    Write-Host "✅ 성공!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ 실패: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "2️⃣  송장 발급 API 테스트" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

$shipmentBody = @{
    order_id = $testOrderId
    pickup_address = "서울시 강남구 테헤란로 123"
    pickup_phone = "010-1234-5678"
    delivery_address = "서울시 강남구 테헤란로 456"
    delivery_phone = "010-9876-5432"
    customer_name = "홍길동"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/shipments-book" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $anonKey"
        } `
        -Body $shipmentBody
    
    Write-Host "✅ 성공!" -ForegroundColor Green
    $trackingNo = $response.tracking_no
    Write-Host "송장번호: $trackingNo" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ 실패: $($_.Exception.Message)" -ForegroundColor Red
    $trackingNo = "MOCK1234567890123"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "3️⃣  영상 업로드 API 테스트" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

$videoBody = @{
    tracking_no = $trackingNo
    video_type = "INBOUND"
    video_url = "https://example.com/video.mp4"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/videos-upload" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $anonKey"
        } `
        -Body $videoBody
    
    Write-Host "✅ 성공!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ 실패: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎯 테스트 완료!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tip: Edge Functions가 실행 중인지 확인하세요" -ForegroundColor Yellow
Write-Host "   cd apps/edge && supabase functions serve" -ForegroundColor Cyan
Write-Host ""

