# 📱 소셜 로그인 현황 및 TODO

> 마지막 업데이트: 2026-01-23

## ✅ 완료된 로그인

### 🟢 Google 로그인
- **상태**: ✅ 작동 중
- **방식**: Supabase OAuth
- **설정**: 완료

### 🟢 Kakao 로그인
- **상태**: ✅ 작동 중
- **방식**: Supabase OAuth
- **설정**: 완료 (비즈 앱 전환 완료)

---

## 🟡 추가 작업 필요

### 🟡 Naver 로그인
- **상태**: 코드 구현 완료, 실제 기기 테스트 필요
- **문제**: iOS 시뮬레이터에서 SDK 크래시 발생
- **해결 방법**: 실제 iPhone에서 테스트

#### TODO:
- [ ] 실제 iOS 기기에서 네이버 로그인 테스트
- [ ] Android 기기/에뮬레이터에서 테스트
- [ ] 정상 작동 확인 후 검수 요청

#### 관련 정보:
- **Client ID**: `b7QJILomSlfsFL7RuAQs`
- **네이버 개발자 센터**: https://developers.naver.com/apps/#/myapps/b7QJILomSlfsFL7RuAQs/overview

---

### 🟡 Apple 로그인
- **상태**: 코드 구현 완료, Apple Developer 계정 설정 필요
- **비용**: $99/년 (Apple Developer Program)

#### TODO:
1. [ ] Apple Developer Program 가입 ($99/년)
2. [ ] App ID에서 "Sign In with Apple" 활성화
3. [ ] Service ID 생성 (웹 로그인용)
4. [ ] Key 생성 (.p8 파일 다운로드)
5. [ ] Supabase Dashboard > Auth > Providers > Apple 설정
6. [ ] Xcode에서 Capability 추가 확인
7. [ ] 실제 기기에서 테스트

#### Supabase 설정 시 필요한 값:
- iOS Bundle ID: `com.example.modoRepair` (실제 값 확인 필요)
- Secret Key: `.p8` 파일 내용
- Key ID: Apple에서 발급
- Team ID: Apple Developer 계정 Team ID

#### 참고 문서:
- `APPLE_LOGIN_SETUP.md` - 상세 설정 가이드

---

## 📂 관련 파일

### 코드
- `lib/services/auth_service.dart` - 모든 소셜 로그인 메서드
- `lib/features/auth/presentation/pages/login_page.dart` - 로그인 UI

### 설정
- `ios/Runner/Info.plist` - iOS URL Scheme 설정
- `ios/Runner/Runner.entitlements` - Apple Sign In capability
- `android/app/src/main/AndroidManifest.xml` - Android 설정
- `.env` - 네이버 Client ID/Secret

### Edge Functions
- `apps/edge/supabase/functions/naver-auth/` - 네이버 토큰 검증

### 마이그레이션
- `apps/sql/migrations/add_naver_id_to_users.sql` - users 테이블 naver_id 컬럼

---

## 🎯 앱스토어 출시 전 필수

⚠️ **Apple 정책**: 소셜 로그인 제공 시 Apple Sign In 필수!
- Google/Kakao/Naver 로그인이 있으면 Apple 로그인도 반드시 구현해야 앱스토어 승인 가능

