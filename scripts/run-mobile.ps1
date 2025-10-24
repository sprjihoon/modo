# Mobile 앱 실행 스크립트

Write-Host "📱 Mobile 앱을 시작합니다..." -ForegroundColor Green
Write-Host ""

Set-Location apps/mobile

# .env 확인
if (!(Test-Path ".env")) {
    Write-Host "⚠️  .env 파일이 없습니다!" -ForegroundColor Yellow
    Write-Host "   생성 중..." -ForegroundColor Cyan
    @"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env 생성 완료" -ForegroundColor Green
    Write-Host "⚠️  실제 Supabase 키를 입력하세요!" -ForegroundColor Yellow
    Write-Host ""
}

# Firebase 더미 파일 확인
$firebaseAndroid = "android/app/google-services.json"
$firebaseIos = "ios/Runner/GoogleService-Info.plist"

if (!(Test-Path $firebaseAndroid)) {
    Write-Host "⚠️  $firebaseAndroid 없음" -ForegroundColor Yellow
}

if (!(Test-Path $firebaseIos)) {
    Write-Host "⚠️  $firebaseIos 없음" -ForegroundColor Yellow
}

Write-Host "📦 의존성 확인 중..." -ForegroundColor Cyan
flutter pub get

Write-Host ""
Write-Host "🔍 연결된 디바이스 확인..." -ForegroundColor Cyan
flutter devices

Write-Host ""
Write-Host "🚀 앱 실행..." -ForegroundColor Cyan
Write-Host "💡 특정 디바이스: flutter run -d <device-id>" -ForegroundColor Yellow
Write-Host ""

flutter run

