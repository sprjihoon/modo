# 🧪 테스트 시작 가이드

## Step 1: 환경 설정 (.env.local 파일 생성)

### 방법 1: 수동 생성 (추천)

1. `modo/apps/admin/.env.local` 파일을 열거나 생성
2. 아래 내용을 복사하여 붙여넣기
3. `your_*` 부분을 실제 값으로 변경

```bash
# 기존 환경 변수 (이미 있다면 그대로 유지)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_stream_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 🚀 Feature Flags (테스트용 - 새로 추가)
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=true
NEXT_PUBLIC_BETA_MODE=true
```

### 방법 2: 터미널에서 생성

```bash
cd modo/apps/admin

# 기존 .env.local 백업 (있는 경우)
cp .env.local .env.local.backup

# Feature Flags 추가
cat >> .env.local << 'EOF'

# 🚀 Video Processing Feature Flags (Test Mode)
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=true
NEXT_PUBLIC_BETA_MODE=true
EOF
```

---

## Step 2: 개발 서버 실행

```bash
cd modo/apps/admin
npm run dev
```

**예상 출력:**
```
> next dev

- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

---

## Step 3: 브라우저에서 확인

1. **URL 접속**: http://localhost:3000
2. **로그인** (필요 시)
3. **주문 상세 페이지 이동**: `/dashboard/orders/[order-id]`
4. **영상 업로드 섹션 확인**

---

## Step 4: 테스트 케이스

### 테스트 1: 작은 파일 업로드 (10MB)

**준비:**
- 10MB 영상 파일 준비

**실행:**
1. "입고 영상 업로드" 버튼 클릭
2. 파일 선택
3. 업로드 시작

**확인 사항:**
- [ ] 진행률 바 표시됨
- [ ] 업로드 속도 표시됨 (MB/s)
- [ ] 남은 시간 표시됨
- [ ] 콘솔 로그: "🚀 Using TUS Protocol"
- [ ] 성공 메시지 표시

**예상 시간:** 5-10초

---

### 테스트 2: 중간 파일 업로드 (50MB)

**실행:**
1. "출고 영상 업로드" 버튼 클릭
2. 50MB 파일 선택
3. 업로드 시작

**확인 사항:**
- [ ] 진행률이 부드럽게 증가
- [ ] 메모리 사용량 확인 (Chrome Task Manager)
- [ ] 업로드 완료까지 중단 없음

**예상 시간:** 20-30초

---

### 테스트 3: 네트워크 중단 테스트

**실행:**
1. 100MB 파일 업로드 시작
2. **진행률 50%쯤**에서:
   - Chrome DevTools (F12) > Network 탭
   - "Offline" 체크박스 클릭 (네트워크 끊기)
3. 10초 대기
4. "Offline" 체크박스 해제 (네트워크 복구)

**확인 사항:**
- [ ] 네트워크 끊김 시: 업로드 일시 정지
- [ ] 네트워크 복구 시: 자동으로 재개
- [ ] 진행률이 50%부터 계속됨 (처음부터 다시 하지 않음)
- [ ] 최종 업로드 성공

**이것이 TUS Protocol의 핵심 기능!** ⭐

---

### 테스트 4: 대용량 파일 (100MB+)

**실행:**
1. 100MB 이상 파일 업로드
2. Chrome Task Manager로 메모리 모니터링

**확인 사항:**
- [ ] 메모리 사용량 < 300MB
- [ ] 브라우저가 느려지지 않음
- [ ] 업로드 완료

**기존 시스템:**
- 메모리: 500-700MB
- 브라우저 느려짐

**개선된 시스템:**
- 메모리: 200-300MB (-60%)
- 브라우저 정상 작동

---

## Step 5: 콘솔 로그 확인

**Chrome DevTools (F12) > Console 탭**

**예상 로그:**
```
🚀 Using TUS Protocol for resumable upload
📤 Upload progress: 5.0%
📤 Upload progress: 10.0%
📤 Upload progress: 25.0%
📤 Upload progress: 50.0%
📤 Upload progress: 75.0%
📤 Upload progress: 100.0%
✅ Upload completed successfully!
🎬 Video ID: abc123xyz789
✅ Media metadata saved to Supabase
```

**디버그 정보:**
```json
{
  "success": true,
  "videoId": "abc123xyz789",
  "duration": 15.5,
  "uploadMethod": "tus",
  "fileUploadMethod": "formdata"
}
```

---

## Step 6: 성능 측정

### 업로드 속도 비교

**기존 시스템 (TUS OFF):**
```bash
# .env.local에서 변경
NEXT_PUBLIC_USE_TUS_UPLOAD=false

# 서버 재시작
npm run dev

# 100MB 파일 업로드 시간 측정
```

**개선된 시스템 (TUS ON):**
```bash
# .env.local에서 변경
NEXT_PUBLIC_USE_TUS_UPLOAD=true

# 서버 재시작
npm run dev

# 100MB 파일 업로드 시간 측정
```

**예상 결과:**
| 방식 | 100MB 파일 | 개선율 |
|------|-----------|--------|
| 기존 (Base64) | 180초 | - |
| 개선 (TUS) | 60초 | **-67%** ⬇️ |

---

## ✅ 테스트 체크리스트

### 기본 기능
- [ ] 파일 선택 가능
- [ ] 업로드 시작됨
- [ ] 진행률 표시됨
- [ ] 업로드 완료됨
- [ ] Video ID 반환됨

### TUS Protocol
- [ ] 네트워크 중단 시 일시 정지
- [ ] 네트워크 복구 시 자동 재개
- [ ] 50%부터 재개됨 (처음부터 X)

### 성능
- [ ] 메모리 < 300MB
- [ ] 업로드 속도 > 기존 시스템
- [ ] 브라우저 정상 작동

### UI
- [ ] 진행률 바
- [ ] 업로드 속도 (MB/s)
- [ ] 남은 시간
- [ ] 에러 메시지 (발생 시)

---

## 🐛 문제 발생 시

### 1. "tus-js-client not found"

```bash
cd modo/apps/admin
npm install tus-js-client @types/tus-js-client
```

### 2. 환경 변수 적용 안 됨

```bash
# 서버 재시작
# Ctrl + C
npm run dev
```

### 3. CORS 에러

```typescript
// next.config.js에 추가
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

---

## 📊 성공 기준

- ✅ 모든 테스트 케이스 통과
- ✅ 네트워크 중단/재개 작동
- ✅ 메모리 < 300MB
- ✅ 업로드 속도 > 기존 시스템
- ✅ 크리티컬 버그 = 0

---

**다음:** Flutter 앱 테스트로 이동

**버전:** 1.0  
**작성일:** 2025-12-18

