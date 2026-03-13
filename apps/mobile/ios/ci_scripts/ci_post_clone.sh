#!/bin/sh

# Xcode Cloud에서 Flutter 빌드를 위한 post-clone 스크립트
# 이 스크립트는 repository clone 후 실행됩니다.

set -e

echo "=========================================="
echo "=== Xcode Cloud Flutter 빌드 준비 시작 ==="
echo "=========================================="

echo "현재 디렉토리: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "CI_WORKSPACE: $CI_WORKSPACE"

# Flutter SDK 설치
FLUTTER_VERSION="3.32.2"
FLUTTER_SDK_DIR="$HOME/flutter"

echo ""
echo "=== 1. Flutter SDK 설치 ==="

if [ -d "$FLUTTER_SDK_DIR" ]; then
    echo "Flutter SDK가 이미 존재합니다: $FLUTTER_SDK_DIR"
else
    echo "Flutter SDK 다운로드 중... (버전: stable)"
    cd "$HOME"
    git clone https://github.com/flutter/flutter.git -b stable --depth 1
    echo "Flutter SDK 다운로드 완료"
fi

# PATH에 Flutter 추가
export PATH="$FLUTTER_SDK_DIR/bin:$PATH"

echo ""
echo "=== 2. Flutter 버전 확인 ==="
flutter --version

echo ""
echo "=== 3. Flutter doctor ==="
flutter doctor -v || true

# 프로젝트 디렉토리로 이동
echo ""
echo "=== 4. 프로젝트 디렉토리로 이동 ==="

# CI_PRIMARY_REPOSITORY_PATH가 설정되어 있으면 사용, 아니면 현재 위치 기준
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    PROJECT_PATH="$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"
else
    # ci_scripts 폴더에서 실행되므로 상위로 이동
    PROJECT_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
fi

echo "프로젝트 경로: $PROJECT_PATH"
cd "$PROJECT_PATH"
echo "현재 디렉토리: $(pwd)"

# pubspec.yaml 확인
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ 오류: pubspec.yaml을 찾을 수 없습니다!"
    echo "현재 디렉토리 내용:"
    ls -la
    exit 1
fi

echo ""
echo "=== 5. Flutter 패키지 설치 ==="
flutter pub get

echo ""
echo "=== 6. iOS 빌드 준비 (Generated.xcconfig 생성) ==="
flutter build ios --config-only --release --no-codesign

# Generated.xcconfig 확인
echo ""
echo "=== 7. Generated.xcconfig 확인 ==="
if [ -f "ios/Flutter/Generated.xcconfig" ]; then
    echo "✅ Generated.xcconfig 생성 완료"
    echo "내용:"
    cat ios/Flutter/Generated.xcconfig
else
    echo "❌ 오류: Generated.xcconfig 생성 실패!"
    exit 1
fi

echo ""
echo "=== 8. CocoaPods 설치 ==="
cd ios

# Podfile.lock이 있으면 pod install, 없으면 pod install --repo-update
if [ -f "Podfile.lock" ]; then
    echo "Podfile.lock 존재 - pod install 실행"
    pod install
else
    echo "Podfile.lock 없음 - pod install --repo-update 실행"
    pod install --repo-update
fi

echo ""
echo "=========================================="
echo "=== Flutter 빌드 준비 완료 ==="
echo "=========================================="
