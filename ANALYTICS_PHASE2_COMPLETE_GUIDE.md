# 🎯 고객 행동 분석 시스템 Phase 2 완전 가이드

## 🎉 Phase 2 완료!

**코호트 분석 ✅ | 리텐션 분석 ✅ | 고객 여정 시각화 ✅**

---

## 📊 새로 추가된 기능

### 1️⃣ 코호트 분석 (Cohort Analysis)
> **레퍼런스**: Mixpanel Cohorts, Amplitude Cohort Analysis

#### 기능
- ✅ **일별/주별/월별 코호트 정의**
- ✅ **코호트 리텐션 매트릭스**
  - Day 0 부터 Day 90까지 추적
  - Week 0 부터 Week 12까지 추적
- ✅ **코호트별 성과 비교**
  - 전환율
  - 총 매출
  - 사용자당 매출 (ARPU)
  - 평균 주문 금액

#### 활용 사례
```
2024-01월 코호트: 100명
- Day 0: 100% (100명)
- Day 1: 45% (45명)
- Day 7: 23% (23명)
- Day 30: 12% (12명)

인사이트: 30일 리텐션이 12%로 낮음 → 온보딩 개선 필요
```

---

### 2️⃣ 리텐션 분석 (Retention Analysis)
> **레퍼런스**: Mixpanel Retention, Amplitude Retention Curves

#### 분석 타입

##### A. N-Day Retention
특정 날짜에 정확히 재방문하는 비율
- Day 1: 다음날 재방문율
- Day 3: 3일 후 재방문율
- Day 7: 일주일 후 재방문율
- Day 14: 2주 후 재방문율
- Day 30: 한 달 후 재방문율

##### B. Unbounded Retention
특정 날짜 이후 언제든 재방문하는 비율 (누적)
- Day 1+ : 1일 이후 언제든 재방문
- Day 7+ : 7일 이후 언제든 재방문
- Day 30+: 30일 이후 언제든 재방문

##### C. 구매 리텐션 (재구매율)
첫 구매 후 재구매하는 비율
- 30일 이내 재구매율
- 60일 이내 재구매율
- 90일 이내 재구매율

#### 활용 사례
```
N-Day Retention 분석:
- Day 1: 45%
- Day 7: 23%
- Day 30: 12%

Drop-off 가장 큰 구간: Day 1 → Day 7 (22%p 하락)
→ 7일 이내 리인게이지먼트 캠페인 필요
```

---

### 3️⃣ 고객 여정 시각화 (User Journey)
> **레퍼런스**: Amplitude Journeys, Google Analytics 4 Path Analysis

#### 분석 타입

##### A. 이벤트 시퀀스 분석
3단계 연속 행동 패턴
```
APP_OPEN → PRODUCT_VIEW → CART_ADD
  (발생 횟수: 523회, 전환율: 15%)

APP_OPEN → BANNER_CLICK → ORDER_START
  (발생 횟수: 89회, 전환율: 45%)
```

##### B. 전환 경로 분석
구매에 성공한 세션의 전체 경로
```
경로 1 (가장 많음):
APP_OPEN → PRODUCT_VIEW → CART_ADD → ORDER_START → 
ORDER_PAYMENT_START → ORDER_PAYMENT_SUCCESS
(67회 발생, 평균 소요시간: 12분)

경로 2:
APP_OPEN → BANNER_CLICK → PRODUCT_VIEW → ORDER_START → 
ORDER_PAYMENT_SUCCESS
(34회 발생, 평균 소요시간: 8분)
```

##### C. 페이지 흐름 분석
페이지 간 이동 패턴
```
홈 → 상품 상세: 234회 (45%)
홈 → 장바구니: 123회 (23%)
상품 상세 → 장바구니: 189회 (67%)
```

##### D. 이탈 경로 분석
구매하지 않은 세션의 마지막 행동
```
CART_ADD에서 이탈: 156회 (35%)
ORDER_PAYMENT_START에서 이탈: 89회 (20%)
ORDER_INFO_FILL에서 이탈: 67회 (15%)
```

---

## 🗄️ 데이터베이스 구조

### 생성된 뷰 (11개)

#### 코호트 분석 (4개)
1. **customer_cohorts** - 사용자별 코호트 정의
2. **cohort_retention_daily** - 일별 리텐션
3. **cohort_retention_weekly** - 주별 리텐션
4. **cohort_performance** - 코호트별 성과

#### 리텐션 분석 (3개)
5. **n_day_retention** - N-Day Retention
6. **unbounded_retention** - Unbounded Retention
7. **purchase_retention** - 재구매율

#### 고객 여정 (4개)
8. **event_sequences** - 이벤트 시퀀스
9. **conversion_paths** - 전환 경로
10. **page_flow** - 페이지 흐름
11. **dropout_paths** - 이탈 경로

---

## 🚀 사용 방법

### Step 1: Phase 2 마이그레이션 실행

**파일**: `/Users/jangjihoon/EXECUTE_ANALYTICS_PHASE2.sql`

Supabase Dashboard > SQL Editor에서 실행

### Step 2: API 호출 테스트

#### 코호트 분석
```bash
GET /api/analytics/customer-behavior?type=cohort&startDate=2024-01-01&endDate=2024-12-31
```

**응답**:
```json
{
  "success": true,
  "data": {
    "performance": [
      {
        "cohort_month": "2024-12",
        "cohort_size": 120,
        "users_with_purchase": 54,
        "cohort_conversion_rate": 45.0,
        "total_revenue": 2700000,
        "revenue_per_user": 22500
      }
    ],
    "dailyRetention": [...],
    "weeklyRetention": [...]
  }
}
```

#### 리텐션 분석
```bash
GET /api/analytics/customer-behavior?type=retention&retentionType=n-day
```

**retentionType 옵션**:
- `n-day` - N-Day Retention
- `unbounded` - Unbounded Retention
- `purchase` - 재구매율

**응답**:
```json
{
  "success": true,
  "data": {
    "type": "n-day",
    "data": [
      {
        "cohort_date": "2024-12-01",
        "cohort_size": 100,
        "retention_day_1": 45.0,
        "retention_day_3": 32.0,
        "retention_day_7": 23.0,
        "retention_day_14": 18.0,
        "retention_day_30": 12.0
      }
    ]
  }
}
```

#### 고객 여정 분석
```bash
GET /api/analytics/customer-behavior?type=journey&journeyType=sequences
```

**journeyType 옵션**:
- `sequences` - 이벤트 시퀀스
- `conversion-paths` - 전환 경로
- `page-flow` - 페이지 흐름
- `dropout` - 이탈 경로

**응답**:
```json
{
  "success": true,
  "data": {
    "type": "sequences",
    "data": [
      {
        "event_1": "APP_OPEN",
        "event_2": "PRODUCT_VIEW",
        "event_3": "CART_ADD",
        "sequence_count": 523,
        "converted_sessions": 78,
        "conversion_rate": 14.9
      }
    ]
  }
}
```

### Step 3: 대시보드 확인

```
http://localhost:3000/dashboard/analytics/customer-behavior
```

**새로운 탭**:
- 📊 코호트 탭
- 🔄 리텐션 탭
- 🛤️ 여정 탭

---

## 📈 실제 비즈니스 활용

### 사례 1: 리텐션 개선 캠페인

**문제**: Day 7 리텐션이 23%로 낮음

**분석**:
```sql
SELECT 
  cohort_date,
  cohort_size,
  retention_day_1,
  retention_day_7,
  retention_day_1 - retention_day_7 as drop_off_1_to_7
FROM n_day_retention
ORDER BY cohort_date DESC
LIMIT 10;
```

**발견**:
- Day 1 → Day 7 사이 22%p 하락
- 대부분 Day 3-5 사이 이탈

**해결책**:
- Day 3: 리마인더 푸시 알림
- Day 5: 특별 할인 쿠폰 제공
- Day 7: 개인화된 추천 제품 이메일

**결과**: Day 7 리텐션 23% → 35%로 개선

---

### 사례 2: 재구매율 향상

**문제**: 30일 재구매율 15%로 목표(25%) 미달

**분석**:
```sql
SELECT 
  cohort_date,
  repurchase_rate_30d,
  repurchase_rate_60d,
  repurchase_rate_90d
FROM purchase_retention
ORDER BY cohort_date DESC;
```

**발견**:
- 30일 재구매율: 15%
- 60일 재구매율: 28%
- 90일 재구매율: 35%

**인사이트**: 재구매는 발생하지만 시기가 늦음

**해결책**:
- 첫 구매 후 14일: "다음 구매 준비 되셨나요?" 이메일
- 21일: 재구매 10% 할인
- 28일: 로열티 포인트 2배 적립 이벤트

**결과**: 30일 재구매율 15% → 22%로 개선

---

### 사례 3: 최적 전환 경로 발견

**문제**: 전환율을 높이고 싶음

**분석**:
```sql
SELECT 
  event_path,
  occurrence_count,
  avg_duration_seconds / 60 as avg_duration_minutes
FROM conversion_paths
ORDER BY occurrence_count DESC
LIMIT 5;
```

**발견**:
```
경로 A (일반):
APP_OPEN → PRODUCT_VIEW → CART_ADD → ORDER_START → PAYMENT
- 전환율: 12%
- 평균 소요 시간: 15분

경로 B (배너를 통한):
APP_OPEN → BANNER_CLICK → PRODUCT_VIEW → ORDER_START → PAYMENT
- 전환율: 45%
- 평균 소요 시간: 8분
```

**해결책**:
- 배너를 더 돋보이게 배치
- 배너 클릭 시 바로 구매 가능하도록 간소화
- A/B 테스트로 최적 배너 위치 찾기

**결과**: 전체 전환율 12% → 18%로 개선

---

### 사례 4: 코호트별 맞춤 전략

**문제**: 모든 고객을 동일하게 대우

**분석**:
```sql
SELECT 
  cohort_month,
  cohort_conversion_rate,
  avg_order_value,
  revenue_per_user
FROM cohort_performance
ORDER BY revenue_per_user DESC;
```

**발견**:
```
2024-09월 코호트:
- 전환율: 45%
- AOV: 65,000원
- ARPU: 29,250원
→ 최고 성과 코호트

2024-12월 코호트:
- 전환율: 22%
- AOV: 45,000원
- ARPU: 9,900원
→ 저성과 코호트
```

**전략**:
- 9월 코호트: VIP 프로그램 초대, 신제품 우선 공개
- 12월 코호트: 온보딩 강화, 첫 구매 할인

**결과**: 12월 코호트 전환율 22% → 32%로 개선

---

## 🎨 시각화 권장사항

### 1. 코호트 리텐션 히트맵
```
           Day 0  Day 1  Day 7  Day 14  Day 30
2024-01    100%    45%    23%     18%     12%
2024-02    100%    48%    25%     20%     15%
2024-03    100%    52%    28%     22%     18%
```
- 색상: 높음(녹색) → 낮음(빨강)
- 패턴을 한눈에 파악

### 2. 리텐션 커브
```
Retention Rate (%)
100 ┤●
 90 ┤
 80 ┤ ●
 70 ┤  ●
 60 ┤   ●
 50 ┤    ●
 40 ┤     ●
 30 ┤       ●
 20 ┤         ●
 10 ┤            ●
  0 └─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬→
    0 1 3 7 14 21 28 60 90  Days
```

### 3. Sankey 다이어그램 (고객 여정)
```
APP_OPEN ══════════╗
(1000명)           ║
                   ╠══ PRODUCT_VIEW ═══════╗
                   ║   (700명)             ║
                   ║                       ╠══ CART_ADD ══════╗
                   ║                       ║   (350명)        ║
                   ║                       ║                  ╠══ ORDER_START
                   ║                       ║                  ║   (210명)
                   ║                       ║                  ║
                   ╚═══ [이탈 300명]       ╚══ [이탈 350명]  ╚══ [이탈 140명]
```

---

## 🔧 고급 쿼리

### 1. 코호트별 LTV 예측
```sql
WITH cohort_ltv AS (
  SELECT 
    c.cohort_month,
    c.user_id,
    SUM(
      CASE 
        WHEN e.event_type = 'ORDER_PAYMENT_SUCCESS' 
        AND e.metadata ? 'amount'
        THEN (e.metadata->>'amount')::numeric
        ELSE 0
      END
    ) as lifetime_value
  FROM customer_cohorts c
  LEFT JOIN customer_events e ON c.user_id = e.user_id
  GROUP BY c.cohort_month, c.user_id
)
SELECT 
  cohort_month,
  COUNT(*) as users,
  ROUND(AVG(lifetime_value), 0) as avg_ltv,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lifetime_value), 0) as median_ltv,
  ROUND(MAX(lifetime_value), 0) as max_ltv
FROM cohort_ltv
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

### 2. 리텐션 예측 모델
```sql
-- 초기 행동 패턴으로 30일 리텐션 예측
WITH first_week_behavior AS (
  SELECT 
    c.user_id,
    c.cohort_date,
    COUNT(*) as events_first_week,
    COUNT(DISTINCT DATE(e.created_at)) as active_days_first_week,
    MAX(CASE WHEN e.event_type = 'CART_ADD' THEN 1 ELSE 0 END) as added_to_cart,
    MAX(CASE WHEN e.event_type = 'ORDER_START' THEN 1 ELSE 0 END) as started_order
  FROM customer_cohorts c
  JOIN customer_events e ON c.user_id = e.user_id
  WHERE DATE(e.created_at) BETWEEN c.cohort_date AND c.cohort_date + 7
  GROUP BY c.user_id, c.cohort_date
),
retention_30d AS (
  SELECT 
    c.user_id,
    MAX(CASE 
      WHEN DATE(e.created_at) = c.cohort_date + 30 
      THEN 1 ELSE 0 
    END) as retained_30d
  FROM customer_cohorts c
  LEFT JOIN customer_events e ON c.user_id = e.user_id
  GROUP BY c.user_id
)
SELECT 
  fwb.events_first_week,
  fwb.active_days_first_week,
  fwb.added_to_cart,
  fwb.started_order,
  ROUND(AVG(r.retained_30d) * 100, 2) as predicted_retention_30d
FROM first_week_behavior fwb
JOIN retention_30d r ON fwb.user_id = r.user_id
GROUP BY 
  fwb.events_first_week,
  fwb.active_days_first_week,
  fwb.added_to_cart,
  fwb.started_order
ORDER BY predicted_retention_30d DESC;
```

### 3. 최적 전환 경로 찾기
```sql
-- 가장 짧은 시간에 전환하는 경로
SELECT 
  event_path,
  COUNT(*) as conversions,
  ROUND(AVG(duration_seconds) / 60, 1) as avg_minutes,
  ROUND(AVG(path_length), 1) as avg_steps
FROM conversion_paths
GROUP BY event_path
HAVING COUNT(*) >= 10
ORDER BY avg_minutes ASC
LIMIT 10;
```

---

## 📚 생성된 파일

```
/Users/jangjihoon/
├── EXECUTE_ANALYTICS_PHASE2.sql ⭐️ (Phase 2 마이그레이션)
└── modo/
    ├── ANALYTICS_PHASE2_COMPLETE_GUIDE.md ⭐️ (이 파일)
    ├── ANALYTICS_SYSTEM_COMPLETE_GUIDE.md (Phase 1 가이드)
    ├── CUSTOMER_ANALYTICS_ENHANCEMENT_PLAN.md (고도화 계획)
    └── apps/admin/
        ├── app/api/analytics/customer-behavior/route.ts ⭐️ (API 업데이트)
        └── app/dashboard/analytics/customer-behavior/page.tsx ⭐️ (UI 업데이트)
```

---

## 🎯 핵심 메트릭 요약

### 코호트 분석
- 코호트 크기
- 코호트별 전환율
- 코호트별 ARPU
- 코호트별 리텐션

### 리텐션 분석
- Day 1/3/7/14/30 리텐션
- Unbounded 리텐션
- 재구매율 (30/60/90일)

### 고객 여정
- 주요 전환 경로
- 평균 전환 소요 시간
- 주요 이탈 지점
- 페이지 흐름 패턴

---

## 🚀 다음 단계 (Phase 3 예정)

### 예측 분석 (Predictive Analytics)
- 이탈 위험 예측 (Churn Prediction)
- LTV 예측
- 다음 구매 확률
- 최적 상품 추천

### 실시간 알림 (Real-time Alerts)
- 이상 패턴 감지
- 목표 달성 알림
- 임계값 초과 알림

### A/B 테스트 프레임워크
- 실험 그룹 관리
- 통계적 유의성 자동 계산
- 실험 결과 대시보드

---

## 🎉 축하합니다!

**Phase 2 완료!** 🎊

이제 여러분은 다음을 할 수 있습니다:

✅ 코호트별로 고객 성과 비교  
✅ 리텐션 패턴으로 이탈 예측  
✅ 전환 경로 최적화  
✅ 데이터 기반 마케팅 전략 수립  

---

**마지막 업데이트**: 2024-12-18  
**작성자**: AI Assistant  
**버전**: 2.0.0  
**레퍼런스**: Mixpanel, Amplitude, Google Analytics 4

