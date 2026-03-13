#!/bin/sh

# Xcode Cloud에서 xcodebuild 실행 전 스크립트
# Generated.xcconfig가 존재하는지 확인

set -e

echo "=== Xcode 빌드 전 확인 ==="

# Flutter SDK 경로 설정
export PATH="$HOME/flutter/bin:$PATH"

# 프로젝트 디렉토리
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"

# Generated.xcconfig 존재 확인
if [ -f "ios/Flutter/Generated.xcconfig" ]; then
    echo "✅ Generated.xcconfig 파일 존재 확인"
    cat ios/Flutter/Generated.xcconfig
else
    echo "⚠️ Generated.xcconfig 파일이 없습니다. 생성 중..."
    flutter build ios --config-only --release --no-codesign
fi

# Pods 확인
if [ -d "ios/Pods" ]; then
    echo "✅ Pods 디렉토리 존재 확인"
else
    echo "⚠️ Pods 디렉토리가 없습니다. pod install 실행 중..."
    cd ios
    pod install --repo-update
fi

echo "=== Xcode 빌드 전 확인 완료 ==="
