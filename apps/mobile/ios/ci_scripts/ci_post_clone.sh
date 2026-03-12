#!/bin/sh

# Xcode Cloud post-clone script
# This script runs after the repository is cloned and before the build starts

set -e

echo "===== CI Post Clone Script Started ====="

# Install Homebrew if not available
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install Flutter via Homebrew
echo "Installing Flutter..."
brew install --cask flutter

# Add Flutter to PATH
export PATH="$PATH:/opt/homebrew/Caskroom/flutter/*/flutter/bin"
export PATH="$PATH:$HOME/Library/Flutter/bin"

# Find and set Flutter path
FLUTTER_PATH=$(find /opt/homebrew/Caskroom/flutter -name "flutter" -type f 2>/dev/null | head -1)
if [ -n "$FLUTTER_PATH" ]; then
    export PATH="$PATH:$(dirname $FLUTTER_PATH)"
fi

echo "Flutter version:"
flutter --version || echo "Flutter not in PATH, trying alternative..."

# Navigate to Flutter project root
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"

echo "Current directory: $(pwd)"

# Run flutter pub get
echo "Running flutter pub get..."
flutter pub get

# Navigate to ios directory
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile/ios"

# Install CocoaPods if not available
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    brew install cocoapods
fi

echo "CocoaPods version: $(pod --version)"

echo "Running pod install..."
pod install --repo-update

echo "===== CI Post Clone Script Completed ====="
