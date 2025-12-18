# 🚀 배포 체크리스트

## 📋 Phase 1: 프로덕션 환경 변수 설정

### Vercel 환경 변수 추가

**위치:** Vercel Dashboard > Settings > Environment Variables

```bash
# 🚀 Video Processing Feature Flags

# Production (처음에는 비활성화)
NEXT_PUBLIC_USE_TUS_UPLOAD=false
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=false
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=false

# Preview (테스트용 활성화)
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=true
```

**설정 방법:**
1. https://vercel.com/[your-team]/[your-project]/settings/environment-variables
2. 위 변수들을 하나씩 추가
3. Environment: Production / Preview 선택

---

## 📋 Phase 2: Preview 배포 (스테이징 테스트)

### Step 1: Git Commit & Push

```bash
cd /Users/jangjihoon/modo

# 변경 사항 확인
git status

# 커밋
git add .
git commit -m "feat: Add video processing improvements with feature flags

- Implement TUS Protocol for resumable uploads
- Add Feature Flag system for gradual rollout
- Add HLS video player for better compatibility
- Prepare Flutter media_kit integration
- Add comprehensive documentation and guides
"

# Push (Preview 자동 배포)
git push origin main
```

### Step 2: Preview URL 확인

Vercel이 자동으로 Preview 배포를 생성합니다.

**예상 URL:**
```
https://your-project-git-main-your-team.vercel.app
```

### Step 3: Preview 환경 테스트

Preview URL에서:
- [ ] 로그인 확인
- [ ] 영상 업로드 테스트
- [ ] 영상 재생 테스트
- [ ] 콘솔 로그 확인 (Feature Flag 작동)

---

## 📋 Phase 3: Production 배포 (10% 사용자)

### 방법 A: Vercel Edge Config (권장)

**장점:** 즉시 켜고 끌 수 있음

```bash
# Vercel CLI 설치
npm i -g vercel

# Edge Config 생성
vercel edge-config create video-features

# Feature Flag 설정
vercel edge-config set video-features useTusUpload false
```

**코드 수정 필요:**
```typescript
// lib/feature-flags.ts
import { get } from '@vercel/edge-config';

export async function getFeatureFlags() {
  const useTusUpload = await get('useTusUpload') ?? false;
  return { useTusUpload };
}
```

### 방법 B: 환경 변수 변경 (간단)

**Vercel Dashboard:**
1. Production 환경 변수 변경
2. 10% 확률로 활성화하는 로직 추가

```typescript
// lib/feature-flags.ts
export function shouldUseTusUpload(): boolean {
  if (typeof window === 'undefined') return false;
  
  // localStorage에 저장된 그룹 확인
  let group = localStorage.getItem('video_feature_group');
  
  if (!group) {
    // 10% 확률로 beta 그룹
    const random = Math.random();
    group = random < 0.1 ? 'beta' : 'control';
    localStorage.setItem('video_feature_group', group);
  }
  
  return group === 'beta' && process.env.NEXT_PUBLIC_USE_TUS_UPLOAD === 'true';
}
```

### 방법 C: 직접 활성화 (가장 간단) ⭐

**Production 환경 변수:**
```bash
# Vercel Dashboard에서 변경
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
```

**재배포:**
```bash
vercel --prod
```

---

## 📋 Phase 4: 모니터링

### Vercel Analytics 확인

1. **에러율 모니터링**
   - Vercel Dashboard > Analytics > Errors
   - 목표: < 2%

2. **성능 모니터링**
   - Response Time
   - 목표: 변화 없음

3. **사용자 피드백**
   - 고객 문의 모니터링
   - 목표: 불만 < 5%

---

## 📋 Phase 5: 점진적 확대

### 일정

| Day | 비율 | 조건 |
|-----|------|------|
| 1-3 | 10% | 에러율 < 2% |
| 4-5 | 25% | 안정적 |
| 6-7 | 50% | 안정적 |
| 8+ | 100% | 최종 검증 |

### 각 단계마다 확인

- [ ] 에러율 < 2%
- [ ] 사용자 불만 < 5건
- [ ] 크리티컬 버그 = 0
- [ ] 성능 저하 없음

---

## 📋 Phase 6: 기존 코드 정리 (2주 후)

### 제거 가능한 코드

```typescript
// ❌ 제거
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";

// ❌ 제거
if (!USE_TUS_UPLOAD) {
  // 기존 방식
}
```

### 정리 후

```typescript
// ✅ 유지
import { uploadToCloudflareStreamTus } from "@/lib/cloudflareStreamUploadTus";

// Feature Flag 제거, TUS만 사용
const videoId = await uploadToCloudflareStreamTus({...});
```

---

## ✅ 전체 체크리스트

### 준비
- [ ] 로컬 테스트 완료
- [ ] 문서 작성 완료
- [ ] 롤백 계획 수립

### 배포
- [ ] Vercel 환경 변수 설정
- [ ] Git commit & push
- [ ] Preview 배포 테스트
- [ ] Production 배포 (10%)
- [ ] 모니터링 설정

### 확대
- [ ] 25% 배포
- [ ] 50% 배포
- [ ] 100% 배포
- [ ] 안정화 확인

### 정리
- [ ] 기존 코드 제거
- [ ] Feature Flag 제거
- [ ] 문서 업데이트
- [ ] 최종 리포트 작성

---

**버전:** 1.0  
**작성일:** 2025-12-18  
**예상 소요 시간:** 1-2주

