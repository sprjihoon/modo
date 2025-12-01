# 🍎 macOS 실행 가이드

## 빠른 시작

### 1. Homebrew 설치 (필요한 경우)

터미널에서 다음 명령어 실행:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 후 PATH 추가 (Apple Silicon Mac의 경우):
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2. Node.js 설치

```bash
brew install node
```

### 3. Flutter 설치 (모바일 앱 실행 시)

```bash
brew install --cask flutter
```

또는 수동 설치:
```bash
# Flutter SDK 다운로드
cd ~
git clone https://github.com/flutter/flutter.git -b stable
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
```

## 앱 실행

### 관리자 웹 앱 (Next.js) 실행

```bash
cd /Users/jangjihoon/modo/apps/admin
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 모바일 앱 (Flutter) 실행

```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter pub get
flutter run -d chrome  # 웹 브라우저에서 실행
# 또는
flutter run -d macos   # macOS 앱으로 실행
```

## 설치 확인

```bash
# Node.js 확인
node --version
npm --version

# Flutter 확인
flutter --version
flutter doctor
```

