# 이전 로그 확인 가이드

## Supabase Dashboard에서 이전 로그 확인

### 빠른 링크
**로그 페이지:**
https://supabase.com/dashboard/project/rzrwediccbamxluegnex/functions/shipments-book/logs

### 단계별 안내

1. **Supabase Dashboard 접속**
   - 위 링크 클릭 또는 직접 접속

2. **"Load older" 버튼 클릭**
   - 로그 목록 하단에 "Load older" 버튼이 있습니다
   - 클릭하면 이전 로그를 더 불러옵니다
   - 여러 번 클릭하여 더 오래된 로그까지 확인 가능

3. **검색 기능 사용**
   - 검색창에 다음 키워드 입력:
     - `getResInfo API 응답`
     - `수거예약 상태 확인 결과`
     - `treatStusCd`
     - `getResInfo API 호출 실패`
     - `getResInfo API 파싱 완료`

4. **시간 범위 선택**
   - 상단에서 시간 범위 선택 가능
   - 최근 1시간, 24시간, 7일 등
   - 더 오래된 로그를 보려면 시간 범위를 넓히세요

## 찾아야 할 로그

### 1. getResInfo API 응답 (중요!)
```
📥 getResInfo API 응답 (XML): <?xml version='1.0' encoding="utf-8"?> ...
```

### 2. getResInfo API 파싱 완료
```
✅ getResInfo API 파싱 완료: {
  reqNo: "...",
  resNo: "...",
  regiNo: "...",
  treatStusCd: "00" 또는 "01",  // 가장 중요!
  ...
}
```

### 3. 수거예약 상태 확인 결과 (가장 중요!)
```
✅ 수거예약 상태 확인 결과: {
  treatStusCd: "00" 또는 "01",
  treatStusMeaning: "소포신청"
}
```

**성공 기준:**
- `treatStusCd`가 `"00"` 또는 `"01"`이면 실제 수거예약이 등록된 것 ✅
- 그 외 값이면 추가 확인 필요

### 4. 에러 로그 (실패한 경우)
```
❌ 수거예약 상태 확인 API 호출 실패!
❌ 에러 상세 정보: {
  error: ...,
  message: "...",
  ...
}
```

## 검색 팁

### 검색어 예시:
- `getResInfo` - getResInfo API 관련 모든 로그
- `treatStusCd` - 수거예약 상태 코드
- `수거예약 상태` - 수거예약 상태 확인 관련 로그
- `API 호출 실패` - 에러 로그

### 로그 순서:
1. `⏳ getResInfo API 호출 시작...`
2. `🔍 getResInfo API 호출 시작:`
3. `📥 getResInfo API 응답 (XML)` ← 여기 확인!
4. `✅ getResInfo API 파싱 완료` ← 여기 확인!
5. `✅ 수거예약 상태 확인 결과` ← 가장 중요!

## 문제 해결

### 로그가 보이지 않는 경우:
1. "Load older" 버튼을 여러 번 클릭
2. 시간 범위를 넓히기 (24시간 또는 7일)
3. 검색어 변경
4. 다른 주문 ID로 검색

### treatStusCd 값 해석:
- `00`: 신청준비
- `01`: 소포신청 (실제 수거예약 등록됨) ✅
- `02`: 운송장출력
- `03`: 집하완료
- `04`: 배송중
- `05`: 배송완료

