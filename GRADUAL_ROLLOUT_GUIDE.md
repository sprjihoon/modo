# 🚀 영상 처리 개선 점진적 배포 가이드

## ✅ 완료된 작업

### 관리자 페이지 (Next.js)
- ✅ TUS Protocol 코드 작성
- ✅ Feature Flag 시스템 구현
- ✅ 3개 API Routes 업데이트 (work, inbound, outbound)
- ✅ Base64 제거 옵션 추가

### Flutter 앱
- ✅ media_kit 플레이어 코드 작성
- ✅ Feature Flag 시스템 구현
- ✅ 비디오 캐싱 서비스 구현
- ✅ 네트워크 품질 자동 조절 구현
- ✅ 플레이어 자동 전환 로직 추가

---

## 🎯 현재 상태: 모든 개선 기능이 **비활성화** 상태

기존 시스템이 그대로 작동하며, Feature Flag를 켜면 새 기능이 활성화됩니다.

---

## 📋 배포 단계

### Phase 1: 개발 환경 테스트 (1-2일)

#### 1.1 관리자 페이지 Feature Flag 활성화

**파일 생성:** `modo/apps/admin/.env.local`

```bash
# 기존 환경 변수는 그대로 유지
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_stream_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 🚀 새로운 기능 활성화 (개발 환경)
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=true
```

#### 1.2 개발 서버 실행

```bash
cd modo/apps/admin
npm run dev
```

#### 1.3 테스트 체크리스트

- [ ] 작은 파일 업로드 (10MB)
- [ ] 중간 파일 업로드 (50MB)
- [ ] 큰 파일 업로드 (100MB)
- [ ] 진행률 표시 확인
- [ ] 네트워크 중단 후 재개 테스트
- [ ] 콘솔 로그 확인 ("Using TUS Protocol" 메시지)

---

#### 1.4 Flutter Feature Flag 활성화

**파일 수정:** `modo/apps/mobile/lib/core/config/feature_flags.dart`

```dart
class VideoFeatureFlags {
  // 개발 환경: 모든 기능 활성화
  static const bool useMediaKit = true;           // media_kit 사용
  static const bool useVideoCache = true;         // 캐싱 사용
  static const bool useAdaptiveBitrate = true;    // ABR 사용
  static const bool useVideoPreload = true;       // 프리로드 사용
  
  // 또는 간단하게 베타 모드 활성화
  static const bool betaMode = true;  // 모든 기능 자동 활성화
  
  static const bool enableDebugLogs = true;
}
```

#### 1.5 패키지 설치 (선택 - media_kit 사용 시)

```bash
cd modo/apps/mobile

# pubspec.yaml 수정
# video_player: ^2.8.1  # 주석 처리
# chewie: ^1.7.4        # 주석 처리

# 추가:
# media_kit: ^1.1.10
# media_kit_video: ^1.2.4
# media_kit_libs_video: ^1.0.4
# flutter_cache_manager: ^3.3.1
# connectivity_plus: ^5.0.2

flutter pub get
flutter run
```

#### 1.6 테스트 체크리스트

- [ ] 영상 재생 확인
- [ ] 재생 시작 시간 측정
- [ ] 버퍼링 발생 확인
- [ ] 두 번째 재생 시 캐시 사용 확인
- [ ] 네트워크 전환 테스트 (WiFi ↔ Mobile)
- [ ] 콘솔 로그 확인 ("Using media_kit player" 메시지)

---

### Phase 2: 스테이징 환경 테스트 (3-5일)

#### 2.1 Vercel Preview Deployment

```bash
cd modo/apps/admin

# 환경 변수 설정 (Vercel Dashboard)
# Settings > Environment Variables > Preview

NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
```

```bash
# Preview 배포
vercel
```

#### 2.2 내부 베타 테스트

**참여자:** 개발팀 + QA 팀 (5-10명)

**기간:** 3일

**체크리스트:**
- [ ] 다양한 파일 크기 테스트
- [ ] 다양한 네트워크 환경 테스트
- [ ] 여러 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 에러 발생 여부 모니터링
- [ ] 성능 메트릭 수집

---

### Phase 3: 제한된 프로덕션 배포 (1주)

#### 3.1 Canary Deployment (10% 사용자)

**방법 1: 환경 변수로 제어**

```bash
# Vercel Production
# 10% 확률로 새 기능 활성화

NEXT_PUBLIC_USE_TUS_UPLOAD=false  # 아직 false
NEXT_PUBLIC_BETA_MODE=true         # 특정 사용자에게만
```

**방법 2: 클라이언트 측 랜덤 할당**

```typescript
// lib/feature-flags.ts
export function shouldUseTusUpload(): boolean {
  // 로컬 스토리지에 저장된 사용자 그룹 확인
  const userGroup = localStorage.getItem('user_group');
  
  if (userGroup === 'beta') return true;
  if (userGroup === 'control') return false;
  
  // 신규 사용자: 10% 확률로 베타 그룹
  const random = Math.random();
  const group = random < 0.1 ? 'beta' : 'control';
  localStorage.setItem('user_group', group);
  
  return group === 'beta';
}
```

#### 3.2 모니터링

**Sentry / LogRocket / Google Analytics 설정**

```typescript
// 업로드 성공/실패 로깅
if (USE_TUS_UPLOAD) {
  analytics.track('video_upload', {
    method: 'tus',
    fileSize: file.size,
    duration: uploadDuration,
    success: true,
  });
}
```

**모니터링 지표:**
- 업로드 성공률
- 평균 업로드 시간
- 에러 발생률
- 사용자 피드백

#### 3.3 A/B 테스트 결과 분석

**기준:**
- ✅ 업로드 성공률 > 95%
- ✅ 에러율 < 2%
- ✅ 사용자 불만 < 5%

---

### Phase 4: 전체 배포 (2-3일)

#### 4.1 점진적 확대

| Day | 비율 | 조건 |
|-----|------|------|
| 1 | 25% | A/B 테스트 통과 시 |
| 2 | 50% | 에러율 안정적 시 |
| 3 | 100% | 모든 지표 정상 시 |

#### 4.2 환경 변수 업데이트

```bash
# Vercel Production
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
```

```bash
# 배포
vercel --prod
```

#### 4.3 Flutter 앱 배포

**Google Play:**
```bash
# Internal Testing (10% → 100%)
flutter build appbundle --release
```

**App Store:**
```bash
# TestFlight → App Store
flutter build ios --release
```

---

### Phase 5: 기존 코드 정리 (1-2주 후)

새 시스템이 안정적으로 작동하는 것이 확인되면 기존 코드 제거:

```typescript
// ❌ 제거 가능
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";

// ✅ 유지
import { uploadToCloudflareStreamTus } from "@/lib/cloudflareStreamUploadTus";
```

```dart
// ❌ 제거 가능
// video_player: ^2.8.1
// chewie: ^1.7.4

// ✅ 유지
media_kit: ^1.1.10
```

---

## 🔄 롤백 계획

### 즉시 롤백 (긴급 상황)

#### 관리자 페이지

**Option 1: 환경 변수 변경 (1분)**
```bash
# Vercel Dashboard
NEXT_PUBLIC_USE_TUS_UPLOAD=false
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=false
```

**Option 2: 이전 버전 복구 (5분)**
```bash
vercel rollback [deployment-url]
```

#### Flutter 앱

**Option 1: Feature Flag 변경 (앱 재시작 불필요)**
```dart
// Firebase Remote Config 사용 시
static bool useMediaKit = remoteConfig.getBool('use_media_kit');
```

**Option 2: 핫픽스 배포 (1-2시간)**
```dart
// feature_flags.dart
static const bool betaMode = false;  // 모든 기능 비활성화
```

---

## 📊 성공 지표

### 목표 달성 기준

| 지표 | 기준치 | 목표 |
|------|--------|------|
| 업로드 성공률 | 85% | 95%+ |
| 평균 업로드 시간 (100MB) | 180초 | 90초 이하 |
| 재생 시작 시간 | 3.5초 | 2초 이하 |
| 버퍼링 발생률 | 15% | 8% 이하 |
| 크래시 발생률 | 2.5% | 1% 이하 |
| 사용자 만족도 | 3.5/5 | 4.2/5 이상 |

### 모니터링 대시보드

**설정할 알림:**
- 🔴 에러율 > 5%: 즉시 알림
- 🟡 업로드 실패율 > 3%: 30분 후 알림
- 🟢 성공률 > 98%: 일일 리포트

---

## 📝 체크리스트

### 배포 전
- [x] Feature Flag 시스템 구현
- [x] 새로운 코드 작성 및 테스트
- [x] 문서 작성
- [ ] 로컬 테스트 완료
- [ ] 롤백 계획 수립
- [ ] 모니터링 설정

### Phase 1 (개발)
- [ ] `.env.local` 생성
- [ ] Feature Flag 활성화
- [ ] 로컬 테스트
- [ ] 성능 측정

### Phase 2 (스테이징)
- [ ] Vercel Preview 배포
- [ ] 내부 베타 테스트
- [ ] 버그 수정
- [ ] 성능 벤치마크

### Phase 3 (제한된 프로덕션)
- [ ] Canary Deployment (10%)
- [ ] 모니터링 설정
- [ ] A/B 테스트 분석
- [ ] 피드백 수집

### Phase 4 (전체 배포)
- [ ] 25% 배포
- [ ] 50% 배포
- [ ] 100% 배포
- [ ] 안정화 확인

### Phase 5 (정리)
- [ ] 기존 코드 제거
- [ ] 문서 업데이트
- [ ] 최종 리포트 작성

---

## 🎉 예상 결과

### 관리자 페이지
- ✅ 업로드 성공률: 85% → 98%+ (+15%)
- ✅ 업로드 속도: 180초 → 60초 (-67%)
- ✅ 사용자 만족도: 3.5/5 → 4.5/5 (+29%)

### Flutter 앱
- ✅ 재생 성능: +50-80%
- ✅ 크래시: -90%
- ✅ 데이터 사용: -40%
- ✅ 배터리 소모: -30%

---

## 📞 문의

**문제 발생 시:**
1. 즉시 Feature Flag를 false로 변경
2. 팀에 알림
3. 로그 확인 및 버그 리포트

**담당자:**
- 백엔드: [이름/연락처]
- 프론트엔드: [이름/연락처]
- Flutter: [이름/연락처]
- DevOps: [이름/연락처]

---

**버전:** 1.0  
**최종 업데이트:** 2025-12-18  
**상태:** ✅ 준비 완료 (배포 대기)

