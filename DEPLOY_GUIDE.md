# Edge Function 배포 가이드

## 예약일시 검증 로직 수정 완료

### 변경 사항
1. **내일 날짜 계산 추가** (일요일 제외)
   - 오늘 예약하면 보통 내일 픽업이 정상
   - 일요일은 픽업 안됨

2. **예약일시 검증 로직 개선**
   - 예약일시가 내일 이후인지 확인
   - 예약일시가 일요일인지 확인
   - 상세한 검증 로그 추가

3. **로그 개선**
   - 오늘 날짜, 내일 날짜 출력
   - 예약일시 요일 출력
   - 예약일시 검증 결과 상세 출력

## 배포 방법

### 방법 1: Supabase Dashboard에서 배포 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택 (프로젝트 ID: `rzrwediccbamxluegnex`)

2. **Edge Functions 배포**
   - 왼쪽 메뉴에서 **Edge Functions** 클릭
   - `shipments-book` 함수 선택
   - **Deploy** 버튼 클릭
   - 또는 **Settings** → **Deploy** 클릭

3. **배포 확인**
   - 배포 완료 후 로그에서 확인
   - 또는 Functions 목록에서 배포 상태 확인

### 방법 2: Supabase CLI로 배포

```bash
# 1. Supabase 로그인
cd /Users/jangjihoon/modo
supabase login

# 2. 프로젝트 연결 (필요시)
supabase link --project-ref rzrwediccbamxluegnex

# 3. Edge Function 배포
supabase functions deploy shipments-book

# 4. 배포 확인
supabase functions list
```

## 배포 후 테스트

### 1. Flutter 앱에서 테스트
- 결제 페이지로 이동
- "🚚 실제 우체국 API" 버튼 클릭

### 2. 로그 확인
Supabase Dashboard → Edge Functions → shipments-book → Logs에서 다음 로그 확인:

```
📅 날짜 정보: {
  오늘: "20241130",
  내일: "20241201",
  오늘요일: "토",
  내일요일: "일"
}
```

```
🔍 개발 체크 - API 응답 검증: {
  resDateYmd: "20251201",
  resDateDayOfWeek: 0,
  resDateDayName: "일",
  tomorrowYmd: "20241201",
  isResDateValid: false,
  ...
}
```

```
⚠️ 예약일시가 이상합니다: {
  예약일시: "20251201",
  예약일시요일: "일",
  문제점: "예약일시(20251201)가 일요일입니다. 일요일은 픽업이 불가능합니다.",
  경고: "예약일시는 내일 이후여야 하며, 일요일은 제외되어야 합니다."
}
```

또는

```
✅ 예약일시가 정상입니다: {
  예약일시: "20241202",
  예약일시요일: "월",
  내일날짜: "20241201"
}
```

## 확인 사항

### 정상 동작 시
- ✅ 예약일시가 내일 이후
- ✅ 예약일시가 일요일이 아님
- ✅ `isResDateValid: true`
- ✅ `✅ 예약일시가 정상입니다` 로그 출력

### 문제 발생 시
- ❌ 예약일시가 내일보다 이전
- ❌ 예약일시가 일요일
- ❌ `isResDateValid: false`
- ❌ `⚠️ 예약일시가 이상합니다` 경고 출력

## 참고 사항

- 예약일시는 우체국 API 응답에서 받는 값입니다
- 요청 시 날짜를 지정할 수 있는 파라미터가 있는지 확인 필요
- 예약일시가 이상한 경우 우체국 고객센터(1588-1300)에 문의

