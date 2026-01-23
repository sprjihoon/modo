# 🍎 Apple Sign In 설정 가이드

## 📋 현재 상태
- ✅ 코드 구현 완료
- ⏳ Apple Developer 계정 설정 필요
- ⏳ Supabase Apple Provider 설정 필요

## 🔧 Apple Developer 설정 (계정 생성 후)

### 1. App ID 설정
1. [Apple Developer Console](https://developer.apple.com/account) 접속
2. Certificates, Identifiers & Profiles > Identifiers
3. 앱의 App ID 선택 (또는 새로 생성)
4. **Sign In with Apple** 체크박스 활성화
5. Save

### 2. Service ID 생성 (웹 로그인용)
1. Identifiers > + 버튼 클릭
2. **Services IDs** 선택
3. Description: `모두의수선 Web Login`
4. Identifier: `kr.io.modo.web` (예시)
5. **Sign In with Apple** 활성화
6. Configure 클릭:
   - Primary App ID: 메인 앱 선택
   - Domains: `rzrwediccbamxluegnex.supabase.co`
   - Return URLs: `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback`

### 3. Key 생성
1. Keys > + 버튼 클릭
2. Key Name: `Modo Repair Sign In`
3. **Sign In with Apple** 체크
4. Configure > Primary App ID 선택
5. Download (`.p8` 파일 저장 - 한 번만 다운로드 가능!)
6. Key ID 기록

## 🔧 Supabase 설정

### Authentication > Providers > Apple
| 항목 | 값 |
|------|-----|
| **Enable Sign in with Apple** | ON |
| **iOS Bundle ID** | `com.example.modoRepair` (실제 번들 ID) |
| **Secret Key** | `.p8` 파일 내용 붙여넣기 |
| **Key ID** | Apple에서 발급받은 Key ID |
| **Team ID** | Apple Developer 계정의 Team ID |

## 📱 iOS 앱 설정 (완료됨)

### Runner.entitlements
```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

### Xcode 추가 설정
1. Xcode에서 프로젝트 열기
2. Runner > Signing & Capabilities
3. **+ Capability** 클릭
4. **Sign In with Apple** 추가

## 🧪 테스트

Apple Developer 계정 설정 후:
1. 실제 iOS 기기에서 테스트 (시뮬레이터 제한적 지원)
2. Apple ID로 로그인 시도
3. Supabase Dashboard에서 사용자 생성 확인

## ⚠️ 주의사항

1. **앱스토어 정책**: 소셜 로그인 제공 시 Apple Sign In 필수
2. **실제 기기 필요**: 시뮬레이터에서는 제한적으로 동작
3. **이메일 숨기기**: 사용자가 이메일을 숨길 수 있음 (relay 이메일 제공)

## 💰 비용
- Apple Developer Program: $99/년 (약 13만원)

