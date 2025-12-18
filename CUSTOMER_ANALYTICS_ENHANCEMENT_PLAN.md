# 고객 행동 분석 시스템 고도화 계획

## 📊 현재 시스템 vs 업계 표준 비교

### ✅ 현재 구현된 기능
- [x] 기본 이벤트 추적 (34가지 이벤트 타입)
- [x] 퍼널 분석
- [x] 이탈 지점 분석
- [x] 기본 전환율 분석
- [x] 디바이스/세션 정보 수집

### 🎯 추가 필요 기능 (업계 표준 기반)

#### 1️⃣ **세션 분석** (Google Analytics, Amplitude)
- 세션당 평균 체류 시간
- 세션당 이벤트 수
- 바운스율 (단일 이벤트 세션)
- 세션 깊이 (페이지뷰 수)

#### 2️⃣ **코호트 분석** (Mixpanel, Amplitude)
- 일별/주별/월별 코호트
- 리텐션 매트릭스
- N일 후 재방문율

#### 3️⃣ **고객 세그먼트 분석** (Segment, Mixpanel)
- 신규 vs 재방문 고객
- 고가치 고객 식별
- 행동 기반 세그먼트

#### 4️⃣ **시간 패턴 분석** (Google Analytics)
- 시간대별 활동 패턴
- 요일별 전환율
- 월별 트렌드

#### 5️⃣ **고객 여정 시각화** (Amplitude Journey)
- Sankey 다이어그램
- 다단계 여정 분석
- 최적 경로 vs 실제 경로

#### 6️⃣ **리텐션 분석** (Mixpanel Retention)
- N-Day Retention
- Unbounded Retention
- 재구매율

#### 7️⃣ **고객 생애 가치 (LTV)** (모든 플랫폼)
- 평균 주문 금액
- 구매 빈도
- 고객 수명

#### 8️⃣ **A/B 테스트 지원** (Optimizely, Google Optimize)
- 실험 그룹 관리
- 통계적 유의성 검증

#### 9️⃣ **예측 분석** (Amplitude Recommend)
- 이탈 위험 예측
- 구매 확률 예측
- 다음 행동 예측

#### 🔟 **실시간 알림** (Heap, Amplitude Alerts)
- 이상 패턴 감지
- 목표 달성 알림
- 임계값 알림

---

## 🔧 구현 우선순위

### Phase 1: 즉시 구현 (1-2일)
✅ **세션 분석**
✅ **시간 패턴 분석**
✅ **디바이스별 상세 분석**

### Phase 2: 단기 구현 (1주)
⏳ **코호트 분석**
⏳ **리텐션 분석**
⏳ **고객 세그먼트**

### Phase 3: 중기 구현 (2주)
⏳ **고객 여정 시각화**
⏳ **LTV 분석**
⏳ **A/B 테스트 프레임워크**

### Phase 4: 장기 구현 (1개월+)
⏳ **예측 분석 (ML)**
⏳ **실시간 알림 시스템**

---

## 📈 Phase 1 상세 구현안

### 1. 세션 분석

#### 데이터베이스 개선
```sql
-- 세션 요약 뷰 생성
CREATE OR REPLACE VIEW customer_session_summary AS
SELECT 
  session_id,
  user_id,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_seconds,
  COUNT(*) as event_count,
  COUNT(DISTINCT event_type) as unique_event_types,
  device_type,
  device_os,
  app_version
FROM customer_events
WHERE session_id IS NOT NULL
GROUP BY session_id, user_id, device_type, device_os, app_version;

-- 세션 메트릭 뷰
CREATE OR REPLACE VIEW session_metrics AS
SELECT 
  DATE(session_start) as date,
  COUNT(*) as total_sessions,
  AVG(duration_seconds) as avg_duration,
  AVG(event_count) as avg_events_per_session,
  COUNT(*) FILTER (WHERE event_count = 1) as bounce_sessions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_count = 1) / COUNT(*),
    2
  ) as bounce_rate
FROM customer_session_summary
GROUP BY DATE(session_start)
ORDER BY date DESC;
```

#### API 추가
```typescript
// GET /api/analytics/customer-behavior?type=session
// Response:
{
  "avgDuration": 180,  // 초
  "avgEventsPerSession": 8.5,
  "bounceRate": 35.2,  // %
  "totalSessions": 1250
}
```

#### 대시보드 컴포넌트
- 세션 체류 시간 차트
- 세션당 이벤트 수 분포
- 바운스율 트렌드

---

### 2. 시간 패턴 분석

#### 데이터베이스 쿼리
```sql
-- 시간대별 활동
CREATE OR REPLACE VIEW hourly_activity AS
SELECT 
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM customer_events
GROUP BY EXTRACT(HOUR FROM created_at), event_type
ORDER BY hour_of_day, event_count DESC;

-- 요일별 전환율
CREATE OR REPLACE VIEW daily_conversion AS
SELECT 
  TO_CHAR(created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM created_at) as day_number,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_START') as orders_started,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') as orders_completed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'ORDER_START'), 0),
    2
  ) as conversion_rate
FROM customer_events
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY day_number;
```

#### 대시보드 컴포넌트
- 히트맵: 시간대 x 요일별 활동
- 시간대별 전환율 라인 차트
- 피크 타임 표시

---

### 3. 디바이스별 상세 분석

#### 데이터베이스 쿼리
```sql
-- 디바이스별 전환 퍼널
CREATE OR REPLACE VIEW device_conversion_funnel AS
SELECT 
  device_type,
  device_os,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) FILTER (WHERE event_type = 'CART_ADD') as cart_adds,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_START') as order_starts,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_START') as payment_attempts,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') as completed_orders,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'ORDER_START'), 0),
    2
  ) as conversion_rate,
  AVG(
    CASE 
      WHEN event_type IN ('ORDER_PAYMENT_START', 'ORDER_PAYMENT_SUCCESS')
      THEN (metadata->>'amount')::numeric
    END
  ) as avg_order_value
FROM customer_events
GROUP BY device_type, device_os
ORDER BY completed_orders DESC;
```

#### 대시보드 컴포넌트
- 디바이스별 전환율 비교 차트
- OS별 성과 테이블
- 디바이스별 평균 주문 금액

---

## 🎨 대시보드 UI 개선안

### 새로운 탭 구조
```
┌─────────────────────────────────────┐
│  Overview | Funnel | Sessions |     │
│  Time Patterns | Devices | Cohorts │
└─────────────────────────────────────┘
```

### Overview 탭
- KPI 카드 (총 이벤트, 활성 사용자, 전환율, AOV)
- 일별 트렌드 차트
- 실시간 활동 피드

### Sessions 탭 (신규)
- 세션 메트릭 요약
- 세션 체류 시간 분포
- 바운스율 트렌드
- 세션당 이벤트 수 분포

### Time Patterns 탭 (신규)
- 24시간 활동 히트맵
- 요일별 전환율 바 차트
- 월별 성장 트렌드
- 피크 타임 인사이트

### Devices 탭 (신규)
- 디바이스 타입별 전환율
- OS별 성과 비교
- 앱 버전별 분석
- 디바이스별 평균 주문 금액

---

## 📊 Phase 2 미리보기: 코호트 분석

### 코호트 테이블 예시
```
         | Day 0 | Day 1 | Day 7 | Day 30
---------|-------|-------|-------|--------
2024-01  | 100%  | 45%   | 23%   | 12%
2024-02  | 100%  | 48%   | 25%   | 15%
2024-03  | 100%  | 52%   | 28%   | 18%
```

### 구현 개요
```sql
-- 코호트 정의
WITH cohorts AS (
  SELECT 
    user_id,
    DATE(MIN(created_at)) as cohort_date
  FROM customer_events
  WHERE event_type = 'APP_OPEN'
  GROUP BY user_id
),
-- 재방문 추적
retention AS (
  SELECT 
    c.cohort_date,
    DATE(e.created_at) as activity_date,
    DATE(e.created_at) - c.cohort_date as days_since_first,
    COUNT(DISTINCT e.user_id) as active_users
  FROM cohorts c
  JOIN customer_events e ON c.user_id = e.user_id
  GROUP BY c.cohort_date, DATE(e.created_at)
)
SELECT * FROM retention;
```

---

## 📱 Flutter 앱 추가 통합

### 세션 시작/종료 명시적 추적
```dart
// 앱 시작
await CustomerEventService.trackEvent(
  eventType: CustomerEventType.APP_OPEN,
  metadata: {
    'session_start': true,
    'previous_session_end': lastSessionEnd,
  },
);

// 앱 종료/백그라운드
await CustomerEventService.trackEvent(
  eventType: CustomerEventType.APP_CLOSE,
  metadata: {
    'session_duration': sessionDuration,
    'events_in_session': eventCount,
  },
);
```

### 페이지별 체류 시간
```dart
class _PageState extends State<Page> {
  DateTime? _pageEnterTime;
  
  @override
  void initState() {
    super.initState();
    _pageEnterTime = DateTime.now();
    CustomerEventService.trackPageView(pageTitle: 'Page Name');
  }
  
  @override
  void dispose() {
    if (_pageEnterTime != null) {
      final duration = DateTime.now().difference(_pageEnterTime!);
      CustomerEventService.trackEvent(
        eventType: CustomerEventType.PAGE_VIEW,
        metadata: {
          'page_exit': true,
          'time_spent_seconds': duration.inSeconds,
        },
      );
    }
    super.dispose();
  }
}
```

---

## 🎯 기대 효과

### Phase 1 완료 후
- ✅ 세션 품질 분석 가능
- ✅ 시간대별 최적화 가능
- ✅ 디바이스별 UX 개선 가능
- ✅ 바운스율 감소 전략 수립

### Phase 2 완료 후
- ✅ 리텐션 개선 전략 수립
- ✅ 고객 세그먼트별 맞춤 마케팅
- ✅ LTV 기반 고객 관리

### Phase 3 완료 후
- ✅ 데이터 기반 제품 개선
- ✅ A/B 테스트 기반 의사결정
- ✅ 예측 기반 선제적 대응

---

## 📋 실행 계획

### 이번 주 (Phase 1)
- [ ] 세션 분석 SQL 뷰 생성
- [ ] 시간 패턴 분석 API 구현
- [ ] 디바이스별 분석 대시보드 추가
- [ ] Flutter 앱 세션 추적 강화

### 다음 주 (Phase 2 준비)
- [ ] 코호트 분석 설계
- [ ] 리텐션 메트릭 정의
- [ ] 고객 세그먼트 로직 구현

---

**마지막 업데이트**: 2024-12-18  
**작성자**: AI Assistant  
**버전**: 2.0.0  
**참고**: Google Analytics 4, Mixpanel, Amplitude, Heap Analytics

