#!/bin/sh

# Xcode Cloud post-clone script
# This script runs after the repository is cloned and before the build starts

set -e

echo "===== CI Post Clone Script Started ====="

# Navigate to the ios directory
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile/ios"

echo "Current directory: $(pwd)"

# Install CocoaPods if not available
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    gem install cocoapods
fi

echo "CocoaPods version: $(pod --version)"

# Navigate to Flutter project root and run flutter pub get
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"

echo "Running flutter pub get..."
flutter pub get

# Navigate back to ios directory
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile/ios"

echo "Running pod install..."
pod install --repo-update

echo "===== CI Post Clone Script Completed ====="
