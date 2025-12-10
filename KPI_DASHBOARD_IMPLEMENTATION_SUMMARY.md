# KPI 대시보드 구축 완료 ✅

## 📋 구현 개요

`action_logs` 데이터를 분석하여 직원들의 성과를 시각화하는 **KPI 대시보드**가 완료되었습니다.

**접속 경로**: `/dashboard/analytics/performance`

---

## ✅ 구현 완료 항목

### 1. KPI 계산 유틸리티

**파일**: `/apps/admin/lib/utils/kpi-calculator.ts`

✅ **날짜 범위 계산**
- 오늘 (Today)
- 이번 주 (Week)
- 이번 달 (Month)

✅ **작업자별 KPI 계산** (`calculateWorkerKPIs`)
- 작업 처리량 (`WORK_COMPLETE` 개수)
- 평균 작업 시간 (WORK_START ~ WORK_COMPLETE 자동 매칭)
- 추가과금 요청 수 (`REQ_EXTRA_CHARGE` 개수)

✅ **관리자별 KPI 계산** (`calculateManagerKPIs`)
- 입출고 처리량 (`SCAN_INBOUND` + `SCAN_OUTBOUND`)
- CS/승인 처리량 (`APPROVE_EXTRA` + `RETURN_PROCESS`)

✅ **전체 요약 통계** (`calculateSummaryStats`)
- 전체 작업 건수
- 출고 건수
- 대기 중인 작업 (WORK_START - WORK_COMPLETE)
- 추가과금 요청 수

✅ **헬퍼 함수**
- 로그 필터링 (날짜, 액션 타입, 사용자)
- 시간 포맷팅 (초 → 시:분)
- 기간 표시 이름

---

### 2. UI 컴포넌트

#### A. Summary Cards (요약 카드)

**파일**: `/apps/admin/components/analytics/summary-cards.tsx`

✅ 4개의 요약 카드
- 전체 작업 건수 (파란색)
- 출고 건수 (초록색)
- 대기 중인 작업 (노란색)
- 추가과금 요청 (보라색)

✅ 아이콘과 색상으로 시각적 구분
✅ 반응형 그리드 레이아웃 (모바일 대응)

#### B. Leaderboard (랭킹 리스트)

**파일**: `/apps/admin/components/analytics/leaderboard.tsx`

✅ **작업자 랭킹**
- 작업 완료 건수 기준 정렬
- 1~3위 특별 아이콘 (🏆🥈🥉)
- 평균 작업 시간 표시
- 추가과금 요청 수 표시

✅ **관리자 랭킹**
- 입출고 + CS 처리 건수 기준 정렬
- 1~3위 특별 배지
- 입출고/CS 건수 구분 표시

✅ 그라데이션 배경 (상위 3명)
✅ 반응형 2열 레이아웃

#### C. Audit Trail (활동 로그 이력)

**파일**: `/apps/admin/components/analytics/audit-trail.tsx`

✅ 최근 20개 로그 타임라인
✅ 액션별 아이콘 (13개 타입)
✅ 액션별 색상 배지
✅ 역할 배지 (ADMIN/MANAGER/WORKER)
✅ 메타데이터 표시
✅ 상대 시간 표시 ("3분 전", "1시간 전")
✅ 주문 상세 링크 (클릭 시 주문 페이지 이동)
✅ 스크롤 가능 (500px 높이)

---

### 3. Performance Dashboard 페이지

**파일**: `/apps/admin/app/dashboard/analytics/performance/page.tsx`

✅ **기간 선택 필터**
- 오늘 / 이번 주 / 이번 달
- Select 드롭다운

✅ **자동 새로고침**
- 새로고침 버튼
- 마지막 업데이트 시간 표시

✅ **데이터 로딩**
- 로딩 스피너
- 에러 핸들링

✅ **빈 데이터 처리**
- "데이터가 없습니다" 메시지
- 다른 기간 선택 안내

✅ **통계 정보**
- 총 로그 수
- 활동 작업자 수
- 활동 관리자 수
- 현재 기간 표시

✅ **클라이언트 사이드 집계**
- 모든 계산은 클라이언트에서 수행
- DB 쿼리 최적화 (기간 필터링)

---

### 4. 네비게이션 통합

**파일**: `/apps/admin/app/dashboard/analytics/page.tsx`

✅ 기존 통계 페이지에 "직원 성과 대시보드" 링크 추가
✅ 상단 헤더에 버튼 추가
✅ 안내 카드 추가 (그라데이션 배경)

---

## 🎯 구현된 KPI 지표

### A. 작업자별 성과 (Worker KPI)

| 지표 | 계산 방식 | 표시 위치 |
|------|----------|----------|
| **작업 처리량** | `WORK_COMPLETE` 로그 개수 | Leaderboard |
| **평균 작업 시간** | (WORK_COMPLETE 시간 - WORK_START 시간) 평균 | Leaderboard |
| **추가과금 요청 수** | `REQ_EXTRA_CHARGE` 로그 개수 | Leaderboard |

### B. 관리자별 성과 (Manager KPI)

| 지표 | 계산 방식 | 표시 위치 |
|------|----------|----------|
| **입출고 처리량** | `SCAN_INBOUND` + `SCAN_OUTBOUND` | Leaderboard |
| **CS/승인 처리량** | `APPROVE_EXTRA` + `RETURN_PROCESS` | Leaderboard |

### C. 전체 요약 통계

| 지표 | 계산 방식 | 표시 위치 |
|------|----------|----------|
| **전체 작업 건수** | `WORK_COMPLETE` 총 개수 | Summary Cards |
| **출고 건수** | `SCAN_OUTBOUND` 총 개수 | Summary Cards |
| **대기 중인 작업** | `WORK_START` - `WORK_COMPLETE` | Summary Cards |
| **추가과금 요청** | `REQ_EXTRA_CHARGE` 총 개수 | Summary Cards |

---

## 📊 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│  직원 성과 대시보드                    [새로고침]         │
│  작업자와 관리자의 업무 활동 분석                        │
├─────────────────────────────────────────────────────────┤
│  📅 기간 선택: [오늘 ▼]    마지막 업데이트: 14:30      │
├─────────────────────────────────────────────────────────┤
│  [전체 작업 52건] [출고 23건] [대기 5건] [추가과금 3건] │
├─────────────────────────────────────────────────────────┤
│  🏆 작업자 랭킹              🎖️ 관리자 랭킹             │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ 🏆 홍길동 (52건) │      │ 🏆 김관리 (45건) │        │
│  │ 🥈 김철수 (48건) │      │ 🥈 이관리 (38건) │        │
│  │ 🥉 이영희 (42건) │      │ 🥉 박관리 (32건) │        │
│  └──────────────────┘      └──────────────────┘        │
├─────────────────────────────────────────────────────────┤
│  🕐 최근 활동 로그                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [10:05] 김작업님이 작업 완료 (O-123)  [상세보기→]│   │
│  │ [09:58] 이관리님이 출고 스캔 (O-122)  [상세보기→]│   │
│  │ [09:45] 홍작업님이 작업 시작 (O-124)  [상세보기→]│   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  총 로그: 156  |  활동 작업자: 8  |  활동 관리자: 3     │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 사용 방법

### 1. 대시보드 접속

```
관리자 로그인 → 통계 및 분석 → 직원 성과 대시보드
또는
직접 접속: /dashboard/analytics/performance
```

### 2. 기간 선택

- 드롭다운에서 "오늘", "이번 주", "이번 달" 선택
- 기간이 변경되면 자동으로 데이터 새로고침

### 3. 데이터 새로고침

- 우측 상단 "새로고침" 버튼 클릭
- 최신 로그 데이터 반영

### 4. 상세 정보 확인

- Audit Trail에서 로그 클릭 → 주문 상세 페이지 이동
- 작업자/관리자 이름 확인
- 메타데이터 확인 (작업 시간, 금액 등)

---

## 🔧 기술 구현 세부사항

### 성능 최적화

✅ **기간 필터링**
```typescript
// 클라이언트에서 기간 필터링
const filteredLogs = logs.filter(log => {
  const logDate = new Date(log.timestamp);
  return logDate >= range.start && logDate <= range.end;
});
```

✅ **로그 개수 제한**
```typescript
// 최대 1000개까지만 가져오기
const allLogs = await getAllLogs(1000);
```

✅ **클라이언트 사이드 집계**
- 모든 KPI 계산은 클라이언트에서 수행
- 서버 부하 최소화
- 빠른 응답 속도

### 평균 작업 시간 계산 로직

```typescript
// target_id별로 WORK_START와 WORK_COMPLETE 자동 매칭
const workSessions = new Map<string, { start?: Date; end?: Date }>();

userLogs.forEach(log => {
  if (log.target_id) {
    if (!workSessions.has(log.target_id)) {
      workSessions.set(log.target_id, {});
    }
    
    const session = workSessions.get(log.target_id)!;
    
    if (log.action_type === ActionType.WORK_START) {
      session.start = new Date(log.timestamp);
    } else if (log.action_type === ActionType.WORK_COMPLETE) {
      session.end = new Date(log.timestamp);
    }
  }
});

// 완료된 세션들의 평균 시간 계산
const durations: number[] = [];
workSessions.forEach(session => {
  if (session.start && session.end) {
    const duration = (session.end.getTime() - session.start.getTime()) / 1000;
    if (duration > 0 && duration < 86400) { // 1일 이내만 유효
      durations.push(duration);
    }
  }
});

if (durations.length > 0) {
  avgWorkDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
}
```

---

## 📁 생성된 파일

```
modo/apps/admin/
├── lib/
│   └── utils/
│       └── kpi-calculator.ts ✅ (KPI 계산 유틸리티)
├── components/
│   └── analytics/
│       ├── summary-cards.tsx ✅ (요약 카드)
│       ├── leaderboard.tsx ✅ (랭킹 리스트)
│       └── audit-trail.tsx ✅ (활동 로그)
└── app/
    └── dashboard/
        └── analytics/
            ├── page.tsx ✅ (수정: 링크 추가)
            └── performance/
                └── page.tsx ✅ (KPI 대시보드)
```

---

## 🎨 UI/UX 특징

### 색상 시스템

- **파란색**: 작업 관련 (작업 건수, 작업 시작)
- **초록색**: 완료/승인 (작업 완료, 출고, 승인)
- **노란색**: 대기/경고 (대기 중인 작업)
- **보라색**: 추가과금
- **빨간색**: 삭제/거부

### 아이콘

- 🏆 1위 (금메달)
- 🥈 2위 (은메달)
- 🥉 3위 (동메달)
- 각 액션별 전용 아이콘 (13개)

### 반응형 디자인

- 모바일: 1열 레이아웃
- 태블릿: 2열 레이아웃
- 데스크톱: 4열 레이아웃 (Summary Cards)

---

## 📊 실제 사용 예시

### 시나리오 1: 오늘의 작업 현황 확인

1. 대시보드 접속
2. 기간: "오늘" 선택
3. Summary Cards 확인
   - 전체 작업 52건
   - 출고 23건
   - 대기 5건
4. 작업자 랭킹 확인
   - 홍길동: 52건 (평균 2시간 30분)
   - 김철수: 48건 (평균 2시간 45분)

### 시나리오 2: 이번 주 성과 분석

1. 기간: "이번 주" 선택
2. 작업자 랭킹 확인
   - 누가 가장 많이 작업했는지
   - 평균 작업 시간은 얼마인지
3. 관리자 랭킹 확인
   - 입출고 처리가 원활한지
   - CS 응대가 빠른지

### 시나리오 3: 특정 주문 추적

1. Audit Trail에서 주문 번호 확인
2. "상세보기 →" 클릭
3. 주문 상세 페이지에서 전체 이력 확인

---

## 🧪 테스트 방법

### 1. 데이터 생성

```bash
# Flutter 앱에서 활동 수행
- 로그인
- 작업 시작
- 작업 완료
- 추가과금 요청
- 관리자 승인
```

### 2. 대시보드 확인

```
/dashboard/analytics/performance 접속
→ 로그 데이터 확인
→ 랭킹 확인
→ 활동 로그 확인
```

### 3. SQL로 직접 확인

```sql
-- 오늘 로그 확인
SELECT * FROM action_logs
WHERE timestamp >= CURRENT_DATE
ORDER BY timestamp DESC;

-- 작업 완료 로그 확인
SELECT actor_name, COUNT(*) as count
FROM action_logs
WHERE action_type = 'WORK_COMPLETE'
  AND timestamp >= CURRENT_DATE
GROUP BY actor_name
ORDER BY count DESC;
```

---

## 🎉 완료!

KPI 대시보드가 성공적으로 구축되었습니다!

**다음 단계**:
1. ✅ 마이그레이션 실행 (`create_action_logs.sql`)
2. ✅ 로그 데이터 생성 (직원들의 활동)
3. ✅ 대시보드 접속 (`/dashboard/analytics/performance`)
4. 🔧 필요시 추가 기능 구현
   - 차트 시각화 (Chart.js, Recharts)
   - 엑셀 내보내기
   - 이메일 리포트

---

**구현 완료일**: 2025-12-10
**버전**: 1.0.0
**구현자**: AI Assistant

