#!/bin/sh

# Xcode Cloud에서 xcodebuild 실행 전 스크립트
# Generated.xcconfig가 존재하는지 최종 확인

set -e

echo "=========================================="
echo "=== Xcode 빌드 전 최종 확인 ==="
echo "=========================================="

# Flutter SDK 경로 설정
export PATH="$HOME/flutter/bin:$PATH"

echo "Flutter 버전:"
flutter --version || echo "Flutter를 찾을 수 없습니다"

# 프로젝트 디렉토리 확인
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    PROJECT_PATH="$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"
else
    PROJECT_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
fi

echo "프로젝트 경로: $PROJECT_PATH"

# Generated.xcconfig 존재 확인
GENERATED_CONFIG="$PROJECT_PATH/ios/Flutter/Generated.xcconfig"

if [ -f "$GENERATED_CONFIG" ]; then
    echo "✅ Generated.xcconfig 파일 존재 확인"
    echo ""
    echo "=== Generated.xcconfig 내용 ==="
    cat "$GENERATED_CONFIG"
    echo ""
else
    echo "⚠️ Generated.xcconfig 파일이 없습니다!"
    echo "flutter build ios --config-only 실행 중..."
    
    cd "$PROJECT_PATH"
    flutter pub get
    flutter build ios --config-only --release --no-codesign
    
    if [ -f "$GENERATED_CONFIG" ]; then
        echo "✅ Generated.xcconfig 생성 완료"
        cat "$GENERATED_CONFIG"
    else
        echo "❌ Generated.xcconfig 생성 실패!"
        exit 1
    fi
fi

# Pods 디렉토리 확인
PODS_DIR="$PROJECT_PATH/ios/Pods"

if [ -d "$PODS_DIR" ]; then
    echo "✅ Pods 디렉토리 존재 확인"
else
    echo "⚠️ Pods 디렉토리가 없습니다. pod install 실행 중..."
    cd "$PROJECT_PATH/ios"
    pod install
fi

echo ""
echo "=========================================="
echo "=== Xcode 빌드 전 확인 완료 ==="
echo "=========================================="
