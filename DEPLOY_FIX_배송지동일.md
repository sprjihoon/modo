# 🚀 배송지 동일 문제 수정 배포

## ✅ 수정 완료

### 변경 사항
**파일**: `apps/edge/supabase/functions/shipments-book/index.ts`

**변경 내용** (라인 227-296):
- ❌ 기존: `if (CENTER_FORCE || !deliveryInfo.address)` - 조건부 센터 주소 설정
- ✅ 수정: 조건문 제거 → **항상 센터 주소로 강제 설정**

**이유**:
- 수거 신청은 무조건 **고객(수거지) → 센터(배송지)** 
- CENTER_FORCE 설정과 관계없이 배송지는 항상 센터여야 함
- 사용자가 "배송지 동일"을 선택해도 센터 주소로 강제됨

## 🚀 배포 명령

```bash
cd /Users/jangjihoon/modo

# Edge Function 배포
supabase functions deploy shipments-book
```

## ✅ 배포 후 확인

### 1. 로그 확인
```bash
# Supabase Dashboard → Edge Functions → shipments-book → Logs

찾을 내용:
🔒 수거 신청: 배송지를 센터 주소로 강제 설정 (CENTER_FORCE 무시)
✅ 센터 주소(DB): ...
✅ 배송지 정보 검증 완료 (센터 주소 강제 설정됨)
🔍 주소 비교 (수거지 vs 센터):
  pickup: { address: "고객 주소", zipcode: "42039" }
  delivery: { address: "센터 주소", zipcode: "41142" }
```

### 2. Flutter 앱 테스트
```
1. 새 수거 신청
2. "배송지 동일" 체크 (또는 체크 안함, 상관없음)
3. 수거 신청 완료
4. 로그 확인 → delivery_address가 센터 주소인지 확인
```

### 3. 주소 검증
```bash
# Edge Function 로그에서 확인
📤 rec* = 고객: [고객 주소]  ← 수거지
📥 ord* = 센터: [센터 주소]  ← 배송지 (센터여야 함!)
```

## 🎯 예상 결과

### Before (문제 상황)
```
pickup_address: 대구 수성구 화랑로2길 62
delivery_address: 대구 수성구 화랑로2길 62  ← 같음!
→ 우체국 거부 또는 무시
```

### After (수정 후)
```
pickup_address: 대구 수성구 화랑로2길 62
delivery_address: 대구광역시 동구 동촌로 1  ← 센터!
→ 정상 수거
```

## 📊 테스트 시나리오

### 시나리오 1: 배송지 동일 체크
```
사용자 입력:
- 수거지: 대구 수성구 화랑로2길 62
- 배송지 동일: ✅ 체크

결과:
- pickup_address: 대구 수성구 화랑로2길 62
- delivery_address: 대구광역시 동구 동촌로 1 (센터)
```

### 시나리오 2: 배송지 별도 입력
```
사용자 입력:
- 수거지: 대구 수성구 화랑로2길 62
- 배송지: 서울 강남구 테헤란로 123 (임의 입력)

결과:
- pickup_address: 대구 수성구 화랑로2길 62
- delivery_address: 대구광역시 동구 동촌로 1 (센터) ← 사용자 입력 무시
```

### 시나리오 3: 센터 주소로 직접 입력
```
사용자 입력:
- 수거지: 대구광역시 동구 동촌로 1 (센터 주소)
- 배송지 동일: ✅ 체크

결과:
- ❌ 에러: "수거지 주소가 센터 주소와 동일합니다"
```

## 🔧 롤백 방법 (문제 발생 시)

```bash
cd /Users/jangjihoon/modo

# Git에서 이전 버전 복구
git checkout HEAD~1 apps/edge/supabase/functions/shipments-book/index.ts

# 재배포
supabase functions deploy shipments-book
```

## 📝 추가 개선 사항 (향후)

### Flutter 앱 UI 개선
- "배송지 동일" 옵션 제거 또는 비활성화
- "배송지는 자동으로 센터로 설정됩니다" 안내 문구 추가

### Edge Function 개선
- CENTER_FORCE 환경 변수 완전 제거 (더 이상 불필요)
- 수거 신청 전용 함수로 분리

---

**수정일**: 2024-12-19  
**수정자**: AI Assistant  
**테스트 필요**: ✅ 예

