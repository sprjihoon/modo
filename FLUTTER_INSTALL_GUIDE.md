# 🦋 Flutter 설치 가이드 (Windows)

## 현재 상태
- ✅ **관리자 페이지**: http://localhost:3000 (실행 중)
- ⏳ **모바일 앱**: Flutter 설치 필요

---

## 📥 Flutter 설치 방법

### 방법 1: 공식 설치 프로그램 (권장)

1. **Flutter SDK 다운로드**
   - 방문: https://docs.flutter.dev/get-started/install/windows
   - "Get the Flutter SDK" 섹션에서 최신 버전 다운로드
   - 또는 직접 다운로드: https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.16.0-stable.zip

2. **압축 해제**
   ```powershell
   # 예: C:\flutter 폴더에 압축 해제
   # 경로에 공백이나 특수문자가 없는 곳을 선택하세요
   ```

3. **환경 변수 설정**
   - 시스템 환경 변수 편집 열기
   - Path 변수에 `C:\flutter\bin` 추가
   
   **또는 PowerShell에서:**
   ```powershell
   # 현재 세션에만 적용 (임시)
   $env:Path += ";C:\flutter\bin"
   
   # 영구 적용 (관리자 권한 필요)
   [System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\flutter\bin", [System.EnvironmentVariableTarget]::Machine)
   ```

4. **설치 확인**
   ```powershell
   flutter doctor
   ```

---

### 방법 2: 빠른 테스트 (PATH 추가 없이)

Flutter를 다운로드한 후 PATH에 추가하지 않고도 사용할 수 있습니다:

```powershell
# Flutter 경로를 임시로 추가
$env:Path += ";C:\flutter\bin"

# 모바일 앱 실행
cd C:\Users\user\modo\apps\mobile
flutter pub get
flutter run -d chrome
```

---

## 🚀 모바일 앱 실행 (Flutter 설치 후)

### Chrome에서 실행 (가장 빠름)

```powershell
cd C:\Users\user\modo\apps\mobile
flutter pub get
flutter run -d chrome
```

### Windows 데스크톱 앱으로 실행

```powershell
cd C:\Users\user\modo\apps\mobile
flutter pub get
flutter run -d windows
```

### Android 에뮬레이터에서 실행

```powershell
# Android Studio 설치 필요
flutter emulators --launch <emulator_id>
flutter run
```

---

## 📋 Flutter Doctor 체크리스트

설치 후 `flutter doctor` 실행 시 확인할 항목:

```
[✓] Flutter (Channel stable, 3.16.0)
[✓] Windows Version (Windows 10 or later)
[✓] Chrome - develop for the web
[!] Android toolchain (선택사항 - 모바일 앱 개발 시)
[!] Visual Studio (선택사항 - Windows 앱 개발 시)
```

**웹 개발만 하려면**: Flutter + Chrome만 있으면 충분합니다!

---

## 🎯 최소 요구사항

### 웹 브라우저에서만 실행 (가장 간단)
- ✅ Flutter SDK
- ✅ Chrome 브라우저

### Windows 데스크톱 앱
- ✅ Flutter SDK
- ✅ Visual Studio 2022 (C++ 개발 도구)

### Android 앱
- ✅ Flutter SDK
- ✅ Android Studio
- ✅ Android SDK

---

## 🔧 문제 해결

### "flutter: 명령을 찾을 수 없습니다"
```powershell
# PATH 확인
$env:Path

# Flutter 경로 추가
$env:Path += ";C:\flutter\bin"

# 확인
flutter --version
```

### "Waiting for another flutter command to release the startup lock"
```powershell
# Flutter 캐시 삭제
flutter clean
rm -r -fo $env:LOCALAPPDATA\Pub\Cache\hosted\pub.dartlang.org
```

### 의존성 설치 오류
```powershell
cd apps/mobile
flutter clean
flutter pub get
```

---

## ✅ 설치 완료 후

1. **터미널 재시작** (PATH 적용)

2. **Flutter 확인**
   ```powershell
   flutter --version
   flutter doctor
   ```

3. **모바일 앱 실행**
   ```powershell
   cd C:\Users\user\modo\apps\mobile
   flutter pub get
   flutter run -d chrome
   ```

4. **접속**
   - 관리자: http://localhost:3000
   - 모바일: http://localhost:XXXX (자동 할당)

---

## 📞 추가 도움말

- **공식 문서**: https://docs.flutter.dev/get-started/install/windows
- **Flutter 커뮤니티**: https://flutter.dev/community
- **문제 해결**: https://docs.flutter.dev/get-started/flutter-for/web-devs

---

## 💡 팁

1. **Chrome만으로 시작**: 모바일 앱을 웹 브라우저에서 먼저 테스트
2. **Visual Studio Code**: Flutter 개발에 최적화된 에디터
3. **Hot Reload**: 코드 변경 시 즉시 반영 (r 키)
4. **Hot Restart**: 앱 재시작 (R 키)

---

**Flutter 설치 없이도 관리자 페이지는 정상 작동합니다!** 🎉

