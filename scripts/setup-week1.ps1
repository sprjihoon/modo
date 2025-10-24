# WEEK 1 자동 설정 스크립트 (PowerShell)
# 모두의수선 프로젝트 환경 설정

Write-Host "🚀 WEEK 1 환경 설정을 시작합니다..." -ForegroundColor Green
Write-Host ""

# 1. .env 파일 생성 확인
Write-Host "📋 1. 환경변수 파일 확인..." -ForegroundColor Cyan
if (!(Test-Path ".env")) {
    Copy-Item "env.example" ".env"
    Write-Host "✅ .env 파일이 생성되었습니다" -ForegroundColor Green
    Write-Host "⚠️  .env 파일에 실제 Supabase 키를 입력하세요!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env 파일이 이미 존재합니다" -ForegroundColor Green
}

# Mobile .env
if (!(Test-Path "apps/mobile/.env")) {
    Write-Host "📱 Mobile .env 생성 중..." -ForegroundColor Cyan
    @"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
"@ | Out-File -FilePath "apps/mobile/.env" -Encoding UTF8
    Write-Host "✅ apps/mobile/.env 생성 완료" -ForegroundColor Green
}

# Admin .env.local
if (!(Test-Path "apps/admin/.env.local")) {
    Write-Host "🌐 Admin .env.local 생성 중..." -ForegroundColor Cyan
    @"
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@ | Out-File -FilePath "apps/admin/.env.local" -Encoding UTF8
    Write-Host "✅ apps/admin/.env.local 생성 완료" -ForegroundColor Green
}

Write-Host ""

# 2. 의존성 확인
Write-Host "📦 2. 필수 도구 확인..." -ForegroundColor Cyan

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js가 설치되지 않았습니다" -ForegroundColor Red
    Write-Host "   https://nodejs.org 에서 설치하세요" -ForegroundColor Yellow
}

# Flutter
if (Get-Command flutter -ErrorAction SilentlyContinue) {
    $flutterVersion = flutter --version | Select-Object -First 1
    Write-Host "✅ $flutterVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Flutter가 설치되지 않았습니다" -ForegroundColor Red
    Write-Host "   https://flutter.dev 에서 설치하세요" -ForegroundColor Yellow
}

# Supabase CLI
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "✅ Supabase CLI 설치됨" -ForegroundColor Green
} else {
    Write-Host "⚠️  Supabase CLI가 설치되지 않았습니다" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase 로 설치하세요" -ForegroundColor Yellow
}

Write-Host ""

# 3. Admin 의존성 설치 여부 확인
Write-Host "📦 3. Admin 의존성 설치..." -ForegroundColor Cyan
if (!(Test-Path "apps/admin/node_modules")) {
    Write-Host "   npm install 실행 중..." -ForegroundColor Yellow
    Set-Location apps/admin
    npm install
    Set-Location ../..
    Write-Host "✅ Admin 의존성 설치 완료" -ForegroundColor Green
} else {
    Write-Host "✅ Admin 의존성이 이미 설치되어 있습니다" -ForegroundColor Green
}

Write-Host ""

# 4. Firebase 더미 파일 확인
Write-Host "🔥 4. Firebase 더미 파일 확인..." -ForegroundColor Cyan
if (Test-Path "apps/mobile/android/app/google-services.json") {
    Write-Host "✅ google-services.json 존재" -ForegroundColor Green
} else {
    Write-Host "⚠️  google-services.json 없음 (이미 생성됨)" -ForegroundColor Yellow
}

if (Test-Path "apps/mobile/ios/Runner/GoogleService-Info.plist") {
    Write-Host "✅ GoogleService-Info.plist 존재" -ForegroundColor Green
} else {
    Write-Host "⚠️  GoogleService-Info.plist 없음 (이미 생성됨)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ WEEK 1 기본 설정이 완료되었습니다!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 다음 단계:" -ForegroundColor Yellow
Write-Host "1. .env 파일에 실제 Supabase URL과 키를 입력하세요"
Write-Host "2. WEEK1_SETUP.md 문서를 참고하여 Supabase 설정을 완료하세요"
Write-Host "3. 각 앱을 실행하세요:"
Write-Host "   - Admin:  cd apps/admin && npm run dev"
Write-Host "   - Mobile: cd apps/mobile && flutter run"
Write-Host "   - Edge:   cd apps/edge && supabase functions serve"
Write-Host ""
Write-Host "📚 자세한 가이드: WEEK1_SETUP.md" -ForegroundColor Cyan
Write-Host ""

