#!/bin/bash

# 모두의수선 앱 실행 스크립트

echo "🚀 모두의수선 앱 실행 중..."

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되지 않았습니다."
    echo "📦 Node.js 설치 중..."
    nvm install --lts
    nvm use --lts
fi

echo "✅ Node.js 버전: $(node --version)"
echo "✅ npm 버전: $(npm --version)"

# 관리자 웹 앱 디렉토리로 이동
cd /Users/jangjihoon/modo/apps/admin

# 의존성 설치 (처음 실행 시)
if [ ! -d "node_modules" ]; then
    echo "📥 의존성 설치 중..."
    npm install
fi

# 서버 시작
echo "🌐 서버 시작 중..."
echo "👉 브라우저에서 http://localhost:3000 접속하세요"
npm run dev

