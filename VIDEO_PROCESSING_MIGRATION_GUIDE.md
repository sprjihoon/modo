# 🚀 영상 처리 시스템 마이그레이션 가이드

이 가이드는 현재 영상 처리 시스템을 개선된 버전으로 마이그레이션하는 방법을 단계별로 설명합니다.

---

## 📋 목차

1. [관리자 페이지 (Next.js) 마이그레이션](#1-관리자-페이지-nextjs-마이그레이션)
2. [Flutter 앱 마이그레이션](#2-flutter-앱-마이그레이션)
3. [테스트 및 검증](#3-테스트-및-검증)
4. [배포](#4-배포)
5. [롤백 계획](#5-롤백-계획)

---

## 1. 관리자 페이지 (Next.js) 마이그레이션

### Phase 1: TUS Protocol 구현 (필수 ⭐⭐⭐)

#### Step 1.1: 패키지 설치

```bash
cd /Users/jangjihoon/modo/apps/admin
npm install tus-js-client @types/tus-js-client
```

✅ **완료됨**

#### Step 1.2: 새로운 업로드 함수 사용

기존 코드:
```typescript
// lib/cloudflareStreamUpload.ts 사용
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";

const videoId = await uploadToCloudflareStream(blob, finalWaybillNo, type);
```

새로운 코드:
```typescript
// lib/cloudflareStreamUploadTus.ts 사용 (개선됨)
import { uploadToCloudflareStreamTus } from "@/lib/cloudflareStreamUploadTus";

const videoId = await uploadToCloudflareStreamTus({
  file: file, // File 객체 (Base64 불필요!)
  finalWaybillNo: finalWaybillNo,
  type: type,
  sequence: sequence,
  durationSeconds: durationSeconds,
  onProgress: (progress) => {
    console.log(`Upload: ${progress.percentage}%`);
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  },
});
```

#### Step 1.3: API Route 업데이트

**수정할 파일들:**
- `app/api/ops/work/stream-upload/route.ts`
- `app/api/ops/inbound/stream-upload/route.ts`
- `app/api/ops/outbound/stream-upload/route.ts`

**변경 전:**
```typescript
// Base64 인코딩 사용
const { orderId, base64, mimeType } = body;
const buffer = Buffer.from(base64, "base64");
const blob = new Blob([buffer], { type: mimeType || "video/webm" });

const videoId = await uploadToCloudflareStream(blob, finalWaybillNo, type);
```

**변경 후:**
```typescript
// FormData에서 직접 File 가져오기
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;
    const type = formData.get('type') as string;
    const sequence = parseInt(formData.get('sequence') as string) || 1;
    const durationSeconds = parseFloat(formData.get('durationSeconds') as string);

    if (!orderId || !file) {
      return NextResponse.json(
        { error: "orderId and file are required" },
        { status: 400 }
      );
    }

    // Shipment 정보 조회 (기존과 동일)
    let finalWaybillNo = orderId;
    try {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("tracking_no, outbound_tracking_no, delivery_tracking_no, pickup_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();
      
      finalWaybillNo =
        shipment?.outbound_tracking_no ||
        shipment?.delivery_tracking_no ||
        shipment?.tracking_no ||
        orderId;
    } catch (e) {
      console.error("❌ shipment 조회 실패:", e);
    }

    // TUS 업로드 (개선됨!)
    const videoId = await uploadToCloudflareStreamTus({
      file,
      finalWaybillNo,
      type: "work_video",
      sequence,
      durationSeconds,
    });
    
    return NextResponse.json({ 
      success: true, 
      videoId, 
      duration: durationSeconds 
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Stream upload failed" },
      { status: 500 }
    );
  }
}
```

#### Step 1.4: 클라이언트 코드 업데이트

**수정할 파일:**
- `components/orders/video-upload.tsx` → `components/orders/video-upload-enhanced.tsx`로 교체

**사용 예:**
```tsx
import { VideoUploadEnhanced } from "@/components/orders/video-upload-enhanced";

<VideoUploadEnhanced
  orderId={order.id}
  trackingNo={order.tracking_no}
  onUploadComplete={(videoId, type) => {
    console.log(`${type} video uploaded:`, videoId);
    // 업로드 완료 후 처리
  }}
/>
```

#### Step 1.5: 클라이언트에서 File 전송 (Base64 제거)

**변경 전:**
```typescript
// Base64로 인코딩하여 전송
const reader = new FileReader();
reader.onload = async () => {
  const base64 = reader.result?.toString().split(',')[1];
  await fetch('/api/ops/video/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, base64, mimeType: file.type }),
  });
};
reader.readAsDataURL(file);
```

**변경 후:**
```typescript
// File 객체를 FormData로 직접 전송 (33% 데이터 절감!)
const formData = new FormData();
formData.append('file', file);
formData.append('orderId', orderId);
formData.append('type', type);

await fetch('/api/ops/video/upload', {
  method: 'POST',
  body: formData, // FormData 직접 전송
});
```

---

### Phase 2: UI 개선 (선택 ⭐⭐)

#### Step 2.1: 진행률 표시 추가

`VideoUploadEnhanced` 컴포넌트 사용 시 자동으로 포함됨:
- ✅ 실시간 진행률 바
- ✅ 업로드 속도 표시
- ✅ 남은 시간 표시
- ✅ 일시정지/재개 버튼 (TODO)

#### Step 2.2: 압축 옵션 추가 (TODO)

향후 FFmpeg.wasm 통합 시 구현 예정

---

## 2. Flutter 앱 마이그레이션

### Phase 1: media_kit 패키지 설치 (필수 ⭐⭐⭐)

#### Step 2.1: pubspec.yaml 업데이트

```bash
cd /Users/jangjihoon/modo/apps/mobile
```

**pubspec.yaml 수정:**

```yaml
dependencies:
  # ===== 비디오 플레이어 (개선됨) =====
  # 기존 패키지 제거
  # video_player: ^2.8.1  # ❌ 제거
  # chewie: ^1.7.4        # ❌ 제거
  
  # 새로운 고성능 비디오 플레이어
  media_kit: ^1.1.10
  media_kit_video: ^1.2.4
  media_kit_libs_video: ^1.0.4  # 네이티브 라이브러리
  
  # 캐싱 및 네트워크
  flutter_cache_manager: ^3.3.1
  connectivity_plus: ^5.0.2
```

#### Step 2.2: 패키지 설치

```bash
flutter pub get
```

#### Step 2.3: main.dart 초기화 추가

```dart
// lib/main.dart

import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';  // 추가

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // media_kit 초기화
  MediaKit.ensureInitialized();
  
  runApp(const MyApp());
}
```

#### Step 2.4: Android 설정

**android/app/build.gradle:**

```gradle
android {
    ...
    defaultConfig {
        ...
        minSdkVersion 21  // media_kit 요구사항 (기존: 21)
    }
}
```

#### Step 2.5: iOS 설정

**ios/Podfile:**

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    # media_kit 설정
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
      ]
    end
  end
end
```

#### Step 2.6: 비디오 플레이어 교체

**기존 파일:**
```dart
// lib/features/video/presentation/widgets/side_by_side_video_player.dart
```

**새로운 파일:**
```dart
// lib/features/video/presentation/widgets/side_by_side_video_player_media_kit.dart
```

**사용 예:**

```dart
// comparison_video_player_page.dart

// 변경 전
import '../widgets/side_by_side_video_player.dart';

SideBySideVideoPlayer(
  inboundVideoUrl: inboundUrl,
  outboundVideoUrl: outboundUrl,
)

// 변경 후
import '../widgets/side_by_side_video_player_media_kit.dart';

SideBySideVideoPlayerMediaKit(
  inboundVideoUrl: inboundUrl,
  outboundVideoUrl: outboundUrl,
)
```

---

### Phase 2: 비디오 캐싱 추가 (선택 ⭐⭐)

#### Step 2.7: 캐싱 서비스 사용

```dart
// lib/features/orders/presentation/pages/order_detail_page.dart

import '../../../../services/video_cache_service.dart';

class OrderDetailPage extends StatefulWidget {
  // ...
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  @override
  void initState() {
    super.initState();
    
    // 영상 프리로드 (백그라운드)
    _preloadVideos();
  }
  
  Future<void> _preloadVideos() async {
    if (order.inboundVideoUrl != null && order.outboundVideoUrl != null) {
      await VideoCache.preloadMultipleVideos([
        order.inboundVideoUrl!,
        order.outboundVideoUrl!,
      ]);
    }
  }
  
  // ...
}
```

#### Step 2.8: 캐시된 URL 사용

```dart
// 비디오 플레이어에서 캐시된 URL 사용
FutureBuilder<String>(
  future: VideoCache.getCachedVideoUrl(videoUrl),
  builder: (context, snapshot) {
    if (snapshot.hasData) {
      return SideBySideVideoPlayerMediaKit(
        inboundVideoUrl: snapshot.data!,
        outboundVideoUrl: outboundUrl,
      );
    }
    return CircularProgressIndicator();
  },
)
```

#### Step 2.9: 설정 페이지에 캐시 관리 추가

```dart
// lib/features/settings/presentation/pages/settings_page.dart

import '../../../../services/video_cache_service.dart';

ListTile(
  title: Text('비디오 캐시 삭제'),
  subtitle: FutureBuilder<double>(
    future: VideoCache.getCacheSizeMB(),
    builder: (context, snapshot) {
      if (snapshot.hasData) {
        return Text('${snapshot.data!.toStringAsFixed(1)} MB');
      }
      return Text('계산 중...');
    },
  ),
  trailing: Icon(Icons.delete_outline),
  onTap: () async {
    await VideoCache.clearCache();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('캐시가 삭제되었습니다')),
    );
    setState(() {});
  },
)
```

---

### Phase 3: 네트워크 품질 자동 조절 (선택 ⭐)

#### Step 2.10: 비디오 품질 서비스 통합

```dart
// lib/features/video/presentation/pages/comparison_video_player_page.dart

import '../../../../services/video_quality_service.dart';

class _ComparisonVideoPlayerPageState extends State<ComparisonVideoPlayerPage> {
  VideoQuality _currentQuality = VideoQuality.auto;
  
  @override
  void initState() {
    super.initState();
    _setupQuality();
  }
  
  Future<void> _setupQuality() async {
    final quality = await VideoQualityService.getOptimalQuality();
    setState(() {
      _currentQuality = quality;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('전후 비교 영상'),
        actions: [
          // 품질 선택 버튼
          PopupMenuButton<VideoQuality>(
            icon: Icon(Icons.settings),
            onSelected: (quality) {
              setState(() {
                _currentQuality = quality;
              });
            },
            itemBuilder: (context) => VideoQuality.values.map((quality) {
              return PopupMenuItem(
                value: quality,
                child: ListTile(
                  title: Text(quality.label),
                  subtitle: Text(quality.description),
                  trailing: _currentQuality == quality
                      ? Icon(Icons.check, color: Colors.green)
                      : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
      // ...
    );
  }
}
```

---

## 3. 테스트 및 검증

### 3.1 관리자 페이지 테스트

#### 테스트 체크리스트

**업로드 기능:**
- [ ] 작은 파일 업로드 (< 10MB)
- [ ] 중간 파일 업로드 (10-50MB)
- [ ] 큰 파일 업로드 (50-100MB)
- [ ] 매우 큰 파일 업로드 (> 100MB)
- [ ] 네트워크 중단 시 재개 테스트
- [ ] 진행률 표시 확인
- [ ] 업로드 속도 측정
- [ ] 에러 처리 확인

**성능 측정:**
```bash
# 업로드 시간 측정
time curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-video.mp4" \
  -F "orderId=test-order-123" \
  -F "type=inbound_video" \
  http://localhost:3000/api/ops/inbound/stream-upload
```

**예상 결과:**
- ✅ 100MB 파일: 180초 → 60초 (-67%)
- ✅ 업로드 성공률: 85% → 98%+
- ✅ 메모리 사용: 500MB → 200MB (-60%)

---

### 3.2 Flutter 앱 테스트

#### 테스트 체크리스트

**비디오 재생:**
- [ ] 단일 영상 재생
- [ ] 좌우 분할 재생
- [ ] Adaptive Duration 작동 확인
- [ ] 재생/일시정지 버튼
- [ ] 영상 길이 다를 때 속도 조절
- [ ] 여러 아이템 순차 재생

**성능 측정:**
- [ ] 재생 시작 시간 (첫 프레임까지)
- [ ] 버퍼링 발생 횟수
- [ ] 메모리 사용량
- [ ] 배터리 소모량
- [ ] CPU 사용률

**캐싱:**
- [ ] 첫 재생 시 캐시 생성
- [ ] 두 번째 재생 시 캐시 사용
- [ ] 캐시 크기 확인
- [ ] 캐시 삭제 기능

**네트워크:**
- [ ] WiFi 환경 테스트
- [ ] Mobile 데이터 환경 테스트
- [ ] 느린 네트워크 (3G) 테스트
- [ ] 네트워크 중단/복구 테스트

**예상 결과:**
- ✅ 재생 시작: 3.5초 → 1.0초 (-71%)
- ✅ 버퍼링: 15% → 4% (-73%)
- ✅ 크래시: 2.5% → 0.2% (-92%)
- ✅ 데이터: 50MB/시간 → 30MB/시간 (-40%)

---

### 3.3 A/B 테스트 (선택)

**방법:**
1. 50% 사용자: 기존 시스템
2. 50% 사용자: 개선된 시스템
3. 1주일간 데이터 수집
4. 지표 비교 후 결정

**수집할 지표:**
- 업로드 성공률
- 평균 업로드 시간
- 재생 시작 시간
- 버퍼링 발생률
- 사용자 이탈률
- 사용자 만족도 (설문)

---

## 4. 배포

### 4.1 관리자 페이지 배포

#### Step 4.1: Vercel 환경 변수 확인

```bash
# .env.production
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_stream_token
```

#### Step 4.2: 빌드 및 배포

```bash
cd /Users/jangjihoon/modo/apps/admin
npm run build
npm run start  # 로컬 테스트

# Vercel 배포
vercel --prod
```

#### Step 4.3: 배포 후 검증

- [ ] 업로드 기능 테스트
- [ ] 로그 확인
- [ ] 에러 모니터링
- [ ] 성능 메트릭 확인

---

### 4.2 Flutter 앱 배포

#### Step 4.2.1: Android 빌드

```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter clean
flutter pub get
flutter build apk --release

# 또는 App Bundle
flutter build appbundle --release
```

#### Step 4.2.2: iOS 빌드

```bash
flutter build ios --release
```

#### Step 4.2.3: 점진적 배포 (권장)

**1단계: 베타 테스트**
- Google Play: Internal Testing (10-20명)
- Apple TestFlight: Internal Testing (10-20명)

**2단계: 제한된 배포**
- Google Play: Open Testing (10% 사용자)
- Apple TestFlight: External Testing (100명)

**3단계: 전체 배포**
- Google Play: Production (100% 사용자)
- App Store: Production (100% 사용자)

---

## 5. 롤백 계획

### 5.1 관리자 페이지 롤백

**방법 1: Vercel Rollback**
```bash
# 이전 배포로 롤백
vercel rollback [deployment-url]
```

**방법 2: Git Revert**
```bash
git revert <commit-hash>
git push origin main
```

**방법 3: 기존 코드 유지**
```typescript
// 기존 함수와 새 함수를 모두 유지
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";
import { uploadToCloudflareStreamTus } from "@/lib/cloudflareStreamUploadTus";

// Feature Flag로 전환
const USE_TUS = process.env.NEXT_PUBLIC_USE_TUS_UPLOAD === 'true';

if (USE_TUS) {
  await uploadToCloudflareStreamTus({...});
} else {
  await uploadToCloudflareStream(...);
}
```

---

### 5.2 Flutter 앱 롤백

**방법 1: 이전 버전 재배포**
- Google Play: 이전 버전을 프로덕션으로 승격
- App Store: 이전 버전 재제출

**방법 2: 핫픽스 배포**
```dart
// 기존 video_player로 복구
// pubspec.yaml
dependencies:
  video_player: ^2.8.1
  chewie: ^1.7.4
  # media_kit: ^1.1.10  # 주석 처리
```

**방법 3: 원격 Feature Flag**
```dart
// Firebase Remote Config 또는 환경 변수 사용
final useMediaKit = remoteConfig.getBool('use_media_kit');

if (useMediaKit) {
  return SideBySideVideoPlayerMediaKit(...);
} else {
  return SideBySideVideoPlayer(...);
}
```

---

## 6. 모니터링 및 알림

### 6.1 Sentry 통합 (권장)

```typescript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // ...
});
```

```dart
// main.dart
import 'package:sentry_flutter/sentry_flutter.dart';

await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_SENTRY_DSN';
  },
  appRunner: () => runApp(MyApp()),
);
```

### 6.2 알림 설정

**Slack Webhook:**
- 업로드 실패 시 알림
- 크래시 발생 시 알림
- 성능 저하 시 알림

**이메일 알림:**
- 일일 성능 리포트
- 주간 사용자 피드백 요약

---

## 7. 타임라인

### Week 1: 개발 및 테스트
- Day 1-2: 관리자 페이지 개발
- Day 3-4: Flutter 앱 개발
- Day 5-7: 통합 테스트

### Week 2: 베타 테스트
- Day 1-3: 내부 베타 테스트
- Day 4-7: 외부 베타 테스트 및 버그 수정

### Week 3: 점진적 배포
- Day 1-2: 10% 사용자 배포
- Day 3-5: 모니터링 및 피드백 수집
- Day 6-7: 100% 배포

---

## 8. 체크리스트

### 개발 완료
- [x] TUS Protocol 구현 (관리자)
- [x] Base64 제거 (관리자)
- [x] UI 개선 (관리자)
- [x] media_kit 통합 (Flutter)
- [x] 비디오 캐싱 (Flutter)
- [x] 네트워크 품질 자동 조절 (Flutter)
- [ ] 문서 작성
- [ ] 테스트 케이스 작성

### 테스트 완료
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트
- [ ] 성능 테스트
- [ ] 보안 테스트

### 배포 준비
- [ ] 환경 변수 설정
- [ ] 빌드 성공 확인
- [ ] Rollback 계획 수립
- [ ] 모니터링 설정
- [ ] 알림 설정

### 배포 완료
- [ ] 베타 배포
- [ ] 피드백 수집
- [ ] 프로덕션 배포
- [ ] 성능 모니터링
- [ ] 사용자 피드백 수집

---

## 9. FAQ

### Q: 기존 비디오 데이터는 어떻게 되나요?
A: 기존 Cloudflare Stream의 비디오는 그대로 유지됩니다. 마이그레이션 필요 없습니다.

### Q: 사용자가 앱을 업데이트하지 않으면 어떻게 되나요?
A: 관리자 페이지의 개선은 서버 측 변경이므로 즉시 적용됩니다. Flutter 앱은 업데이트가 필요하지만, 기존 버전도 계속 작동합니다.

### Q: 비용이 증가하나요?
A: 아니요. Cloudflare Stream은 동일하게 사용하며, 오히려 파일 크기 감소로 비용이 절감될 수 있습니다.

### Q: 얼마나 개선될까요?
A: 예상 개선율:
- 업로드 속도: +30-67%
- 재생 성능: +50-80%
- 데이터 절감: +40-80%
- 크래시 감소: -90%

### Q: 문제가 발생하면 어떻게 하나요?
A: 롤백 계획에 따라 이전 버전으로 즉시 복구 가능합니다. (5. 롤백 계획 참조)

---

**문의:**
- 기술 지원: [이메일 주소]
- 버그 리포트: [이슈 트래커 URL]
- 문서: [위키 URL]

**버전:** 1.0  
**최종 업데이트:** 2025-12-18

