# Admin 웹 실행 스크립트

Write-Host "🌐 Admin 웹 콘솔을 시작합니다..." -ForegroundColor Green
Write-Host ""

Set-Location apps/admin

# .env.local 확인
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local 파일이 없습니다!" -ForegroundColor Yellow
    Write-Host "   생성 중..." -ForegroundColor Cyan
    @"
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ .env.local 생성 완료" -ForegroundColor Green
    Write-Host "⚠️  실제 Supabase 키를 입력하세요!" -ForegroundColor Yellow
    Write-Host ""
}

# node_modules 확인
if (!(Test-Path "node_modules")) {
    Write-Host "📦 의존성 설치 중..." -ForegroundColor Cyan
    npm install
    Write-Host "✅ 설치 완료" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🚀 개발 서버 시작..." -ForegroundColor Cyan
Write-Host "📍 http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev

