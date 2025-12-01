#!/bin/bash

# 모두의수선 빠른 시작 스크립트

echo "🚀 모두의수선 앱 실행 준비 중..."

# Homebrew PATH 추가 (Apple Silicon Mac)
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Intel Mac
if [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# Node.js 확인 및 설치
if ! command -v node &> /dev/null; then
    echo "📦 Node.js 설치 중..."
    brew install node
else
    echo "✅ Node.js 이미 설치됨: $(node --version)"
fi

# 관리자 웹 앱 실행
echo "🌐 관리자 웹 앱 실행 중..."
cd /Users/jangjihoon/modo/apps/admin

if [ ! -d "node_modules" ]; then
    echo "📥 의존성 설치 중..."
    npm install
fi

echo "✅ 서버 시작 중... http://localhost:3000"
npm run dev

