#!/bin/sh

# Xcode Cloud에서 Flutter 빌드를 위한 post-clone 스크립트
# 이 스크립트는 repository clone 후 실행됩니다.

set -e

echo "=== Flutter 설치 및 빌드 시작 ==="

# Flutter SDK 설치 (fvm 또는 직접 설치)
# Xcode Cloud에서는 Flutter가 기본 설치되어 있지 않으므로 설치 필요

# 1. Flutter SDK 다운로드 및 설치
FLUTTER_VERSION="3.32.2"
FLUTTER_SDK_DIR="$HOME/flutter"

if [ ! -d "$FLUTTER_SDK_DIR" ]; then
    echo "Flutter SDK 다운로드 중..."
    cd $HOME
    git clone https://github.com/flutter/flutter.git -b stable --depth 1
fi

export PATH="$FLUTTER_SDK_DIR/bin:$PATH"

# 2. Flutter 버전 확인
echo "Flutter 버전:"
flutter --version

# 3. 프로젝트 디렉토리로 이동
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"

# 4. Flutter 의존성 설치
echo "Flutter 패키지 설치 중..."
flutter pub get

# 5. iOS 빌드 준비 (Generated.xcconfig 생성)
echo "iOS 빌드 준비 중..."
flutter build ios --config-only --release --no-codesign

# 6. CocoaPods 설치
echo "CocoaPods 설치 중..."
cd ios
pod install --repo-update

echo "=== Flutter 빌드 준비 완료 ==="
