# Supabase Edge Functions 로그 확인 가이드

## 방법 1: Supabase Dashboard (권장)

### 단계별 안내

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - 로그인 필요

2. **프로젝트 선택**
   - 프로젝트 ID: `rzrwediccbamxluegnex`
   - 프로젝트 목록에서 선택

3. **Edge Functions 메뉴 이동**
   - 왼쪽 사이드바에서 **Edge Functions** 클릭
   - 또는 URL: https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions

4. **함수 선택**
   - 함수 목록에서 **`shipments-book`** 클릭
   - 또는 URL: https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions/shipments-book

5. **Logs 탭 선택**
   - 상단 탭에서 **Logs** 클릭
   - 또는 URL: https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions/shipments-book/logs

6. **로그 확인**
   - 최근 로그가 자동으로 표시됨
   - 시간 범위 선택 가능 (최근 1시간, 24시간, 7일 등)
   - 검색 기능 사용 가능

### 로그 검색 팁

#### 검색어 예시:
- `✅ 수거예약 상태 확인 결과` - 수거예약 상태 확인 결과
- `treatStusCd` - 수거예약 상태 코드
- `regiNo` - 운송장번호
- `recTel` - 전화번호
- `예약일시` - 예약일시 관련 로그
- `testYn` - testYn 파라미터 관련 로그

#### 중요한 로그 찾기:
1. **수거예약 상태 확인 결과** (가장 중요!)
   - 검색어: `수거예약 상태 확인 결과`
   - 또는: `treatStusCd`
   - 확인할 값: `treatStusCd: "00"` 또는 `"01"` (정상)

2. **전화번호 설정**
   - 검색어: `센터 전화번호 설정`
   - 또는: `recTel`
   - 확인할 값: `01027239490`

3. **예약일시 검증**
   - 검색어: `예약일시`
   - 확인할 값: `isResDateValid: true/false`

## 방법 2: Supabase CLI

⚠️ **참고**: 현재 Supabase CLI 버전에는 `logs` 명령어가 없습니다. Dashboard를 사용하세요.

### 대안: Supabase API 사용 (고급)

Supabase API를 직접 호출하여 로그를 확인할 수 있습니다:

```bash
# Supabase API를 통한 로그 확인 (예시)
curl -X GET \
  "https://api.supabase.com/v1/projects/rzrwediccbamxluegnex/functions/shipments-book/logs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

하지만 가장 간단한 방법은 **Supabase Dashboard**를 사용하는 것입니다.

## 확인할 로그 항목

### 1. 수거예약 상태 확인 결과 (가장 중요!)

```
✅ 수거예약 상태 확인 결과: {
  reqNo: "...",
  resNo: "...",
  regiNo: "...",
  treatStusCd: "00" 또는 "01",  // 00:신청준비, 01:소포신청 (등록됨)
  treatStusMeaning: "소포신청",
  regiPoNm: "...",
  resDate: "..."
}
```

**성공 기준:**
- `treatStusCd`가 `"00"` 또는 `"01"`이면 실제 수거예약이 등록된 것 ✅
- 그 외 값이면 추가 확인 필요

### 2. 전화번호 설정

```
📞 센터 전화번호 설정: {
  dbPhone: "...",
  envPhone: "...",
  finalPhone: "01027239490",  // 올바른 전화번호
  source: "기본값" | "환경변수" | "DB (ops_center_settings)"
}
```

### 3. 예약일시 검증

```
🔍 개발 체크 - API 응답 검증: {
  resDateYmd: "20251201",
  resDateDayOfWeek: 1,
  resDateDayName: "월",
  todayYmd: "20251201",
  tomorrowYmd: "20251202",
  isResDateValid: true/false
}
```

### 4. testYn 파라미터

```
🔍 개발 체크 - testYn 파라미터: {
  test_mode: false,
  testYn: "N",
  expected: "N",
  isCorrect: true
}
```

## 문제 해결

### 로그가 보이지 않는 경우
1. 시간 범위 확인 (최근 1시간으로 설정)
2. 검색어 확인 (대소문자 구분)
3. 함수 이름 확인 (`shipments-book`)
4. 프로젝트 확인 (올바른 프로젝트 선택)

### 로그가 너무 많은 경우
1. 검색 기능 사용
2. 시간 범위 축소
3. 특정 키워드로 필터링

## 빠른 링크

- **Dashboard**: https://supabase.com/dashboard/project/rzrwediccbamxluegnex
- **Edge Functions**: https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions
- **shipments-book Logs**: https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions/shipments-book/logs

