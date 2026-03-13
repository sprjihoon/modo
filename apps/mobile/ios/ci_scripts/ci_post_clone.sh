#!/bin/sh

# Xcode Cloud에서 Flutter 빌드를 위한 post-clone 스크립트

set -e

echo "=========================================="
echo "=== Xcode Cloud Flutter 빌드 준비 시작 ==="
echo "=========================================="

# Flutter SDK 설치
FLUTTER_SDK_DIR="$HOME/flutter"

echo ""
echo "=== 1. Flutter SDK 설치 ==="

if [ -d "$FLUTTER_SDK_DIR" ]; then
    echo "Flutter SDK가 이미 존재합니다"
else
    echo "Flutter SDK 다운로드 중..."
    git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$FLUTTER_SDK_DIR"
    echo "Flutter SDK 다운로드 완료"
fi

export PATH="$FLUTTER_SDK_DIR/bin:$PATH"

echo ""
echo "=== 2. Flutter 버전 확인 ==="
flutter --version

# 프로젝트 디렉토리로 이동
echo ""
echo "=== 3. 프로젝트 디렉토리로 이동 ==="

if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    PROJECT_PATH="$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"
else
    PROJECT_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
fi

echo "프로젝트 경로: $PROJECT_PATH"
cd "$PROJECT_PATH"

echo ""
echo "=== 4. Flutter 패키지 설치 ==="
flutter pub get

echo ""
echo "=== 5. iOS 빌드 준비 ==="
flutter build ios --config-only --release --no-codesign

echo ""
echo "=== 6. CocoaPods 설치 ==="
cd ios
pod install --repo-update

echo ""
echo "=== 빌드 준비 완료 ==="
