# 📱 통합 알림 시스템 가이드

## 🎯 개요

**통합 알림 시스템**은 고객이 모든 알림을 한 곳에서 확인할 수 있도록 합니다.
- 공지사항
- 주문 알림  
- 추가결제 알림
- 프로모션 알림
- 시스템 알림

---

## ✨ 주요 기능

### 1️⃣ **홈 화면 알림 아이콘**
```
┌──────────────────────────────────────┐
│  모두의수선     🔔³  🛒  📋  👤      │ ← 알림 배지 (읽지 않음 3개)
└──────────────────────────────────────┘
```

**특징:**
- 🔴 읽지 않은 알림 개수 배지 표시
- 🔔 클릭 시 통합 알림 센터 열림
- 🔄 실시간 업데이트

---

### 2️⃣ **통합 알림 센터**
```
┌──────────────────────────────────────┐
│  ← 알림            모두 읽음  🔄      │
├──────────────────────────────────────┤
│  [내 알림 ³]  [공지사항]             │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 💳  💳 추가 결제 요청          │  │
│  │     주문(ORD-001)에 추가 작업  │  │
│  │     이 필요합니다. 15,000원    │  │
│  │     방금 전                ➡️  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📦  입고 완료                  │  │
│  │     주문(ORD-001)이 입고되었   │  │
│  │     습니다. 곧 수선을 시작...  │  │
│  │     1시간 전               ➡️  │  │
│  └────────────────────────────────┘  │
│  ...                                 │
└──────────────────────────────────────┘
```

---

### 3️⃣ **알림 종류**

#### **A. 주문 알림**
| 아이콘 | 제목 | 예시 |
|--------|------|------|
| 📦 | 입고 완료 | 주문(ORD-001)이 입고되었습니다 |
| 🔨 | 수선 중 | 수선 작업이 시작되었습니다 |
| ✅ | 출고 완료 | 수선이 완료되어 출고되었습니다 |
| 🚚 | 배송 완료 | 배송이 완료되었습니다 |

#### **B. 추가결제 알림**
| 아이콘 | 제목 | 예시 |
|--------|------|------|
| 💳 | 추가 결제 요청 | 추가 작업이 필요합니다. 15,000원 |
| ✅ | 추가 결제 완료 | 추가 결제가 완료되었습니다 |

#### **C. 공지사항**
| 이모지 | 유형 | 예시 |
|--------|------|------|
| 🚨 | 긴급 | 시스템 점검 안내 |
| 🎉 | 프로모션 | 신년 맞이 특별 이벤트 |
| 📢 | 일반 | 서비스 이용 안내 |
| 🔧 | 점검 | 정기 점검 안내 |

---

## 📂 파일 구조

```
lib/features/
  home/
    presentation/
      pages/
        home_page.dart                     ← 홈 화면 (알림 아이콘 추가)
      widgets/
        extra_charge_alert_banner.dart     ← 추가결제 배너
  
  notifications/
    presentation/
      pages/
        notifications_page.dart            ← 🆕 통합 알림 센터

apps/sql/test/
  test_notifications_system.sql            ← 🆕 테스트 스크립트
```

---

## 🚀 사용자 시나리오

### **시나리오 1: 추가결제 알림**
```
1. [관리자가 추가결제 요청]
   
2. [FCM 푸시 발송]
   → 고객 스마트폰에 알림
   
3. [홈 화면 진입]
   → 🔔³ 배지 표시
   → 주황색 배너 표시
   
4. [알림 아이콘 클릭]
   → 통합 알림 센터 열림
   → "💳 추가 결제 요청" 알림 표시
   
5. [알림 클릭]
   → 주문 상세 화면으로 이동
   → 추가결제 카드 표시
```

---

### **시나리오 2: 공지사항 확인**
```
1. [관리자가 공지사항 등록]
   
2. [홈 화면 진입]
   → 🔔¹ 배지 표시 (공지사항은 카운트 안 됨)
   
3. [알림 아이콘 클릭]
   → 통합 알림 센터 열림
   
4. ["공지사항" 탭 클릭]
   → 📌 고정 공지 (상단)
   → 🎉 프로모션 공지
   → 📢 일반 공지
   
5. [공지사항 클릭]
   → 상세 내용 확인
```

---

## 🧪 테스트 방법

### **1. 본인 user_id 확인**

Supabase SQL Editor에서 실행:
```sql
SELECT id, email, name 
FROM public.users 
WHERE email = 'your-email@example.com';
```

결과 예시:
```
id: 550e8400-e29b-41d4-a716-446655440000
email: test@example.com
name: 홍길동
```

---

### **2. 테스트 스크립트 실행**

1. `apps/sql/test/test_notifications_system.sql` 파일 열기
2. 3번째 줄 수정:
```sql
v_test_user_id UUID := 'YOUR_USER_ID_HERE';
↓
v_test_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
```
3. Supabase SQL Editor에서 전체 실행
4. 콘솔에서 성공 메시지 확인

**생성되는 데이터:**
- ✅ 알림 5개 (읽지 않음 4개)
- ✅ 공지사항 3개

---

### **3. 앱에서 확인**

#### **A. 홈 화면**
1. 앱 실행
2. 우측 상단 알림 아이콘 확인: 🔔⁴
3. 추가결제 주황색 배너 확인 (있는 경우)

#### **B. 통합 알림 센터**
1. 알림 아이콘 클릭
2. "내 알림" 탭:
   - 💳 추가 결제 요청 (읽지 않음)
   - 📦 입고 완료 (읽지 않음)
   - 🎉 특별 할인 이벤트 (읽지 않음)
   - 📢 앱 업데이트 안내 (읽지 않음)
   - 🔨 수선 중 (읽음)
3. "공지사항" 탭:
   - 📌 🚨 긴급 공지: 시스템 점검 (고정)
   - 🎉 신년 맞이 특별 이벤트
   - 📢 서비스 이용 안내

#### **C. 알림 동작 테스트**
1. 알림 클릭 → 주문 상세로 이동 확인
2. "모두 읽음" 클릭 → 배지 사라짐 확인
3. 새로고침 버튼 클릭 → 데이터 재로드 확인

---

## 🔄 데이터베이스 스키마

### **notifications 테이블**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,           -- 수신자
  order_id UUID,                    -- 주문 ID (선택)
  type TEXT NOT NULL,               -- 알림 유형
  title TEXT NOT NULL,              -- 제목
  body TEXT NOT NULL,               -- 내용
  read BOOLEAN DEFAULT false,       -- 읽음 여부
  read_at TIMESTAMPTZ,              -- 읽은 시간
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **announcements 테이블**
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,               -- urgent, promotion, general, maintenance
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,  -- 상단 고정
  status TEXT NOT NULL,             -- draft, sent
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 알림 우선순위

### **홈 화면 표시**
1. **추가결제 배너** (최우선)
   - PENDING_CUSTOMER 상태일 때만
   - 인사말 바로 아래

2. **알림 배지**
   - 읽지 않은 알림 개수
   - 빨간색 원형 배지

### **알림 센터 정렬**
1. **내 알림 탭**
   - 읽지 않음 우선
   - 최신순 정렬

2. **공지사항 탭**
   - 고정 공지 우선
   - 최신순 정렬

---

## 🎨 UI/UX 특징

### **읽지 않은 알림 강조**
- 🔵 파란색 배경
- 🔴 빨간 점 표시
- **굵은 제목**
- 파란색 테두리 (2px)

### **읽은 알림**
- ⚪ 흰색 배경
- 회색 테두리 (1px)
- 보통 굵기 제목

### **고정 공지사항**
- 📌 고정 배지
- 🟡 노란색 배경
- 노란색 테두리

---

## 🔒 보안

- ✅ RLS 정책으로 본인 알림만 조회
- ✅ user_id 검증
- ✅ 타인 알림 접근 차단

---

## 🐛 트러블슈팅

### **알림 배지가 표시되지 않음**
```
원인: notifications 테이블 조회 실패

해결:
1. 로그인 상태 확인
2. user_id 확인:
   SELECT id FROM public.users 
   WHERE auth_id = auth.uid();
3. RLS 정책 확인
```

### **알림 클릭 시 화면 이동 안 됨**
```
원인: order_id가 없거나 잘못됨

해결:
1. 알림에 order_id가 있는지 확인:
   SELECT order_id FROM public.notifications 
   WHERE id = 'notification-id';
2. 주문이 존재하는지 확인:
   SELECT id FROM public.orders 
   WHERE id = 'order-id';
```

### **공지사항이 표시되지 않음**
```
원인: status가 'sent'가 아님

해결:
UPDATE public.announcements 
SET status = 'sent', sent_at = NOW()
WHERE status = 'draft';
```

---

## 🧹 데이터 정리

### **테스트 알림 삭제**
```sql
-- 최근 1일 이내 생성된 테스트 알림 삭제
DELETE FROM public.notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND created_at > NOW() - INTERVAL '1 day';
```

### **테스트 공지사항 삭제**
```sql
-- 최근 1일 이내 생성된 테스트 공지사항 삭제
DELETE FROM public.announcements 
WHERE created_at > NOW() - INTERVAL '1 day';
```

### **모든 읽음 처리**
```sql
-- 본인의 모든 알림을 읽음 처리
UPDATE public.notifications 
SET read = true, read_at = NOW()
WHERE user_id = 'YOUR_USER_ID' 
AND read = false;
```

---

## 📈 향후 개선 사항

1. **필터링 기능**
   - 알림 유형별 필터
   - 읽음/읽지 않음 필터

2. **검색 기능**
   - 알림 내용 검색
   - 날짜 범위 검색

3. **알림 설정**
   - 알림 유형별 ON/OFF
   - 푸시 알림 설정

4. **삭제 기능**
   - 개별 알림 삭제
   - 읽은 알림 일괄 삭제

---

## ✅ 체크리스트

배포 전 확인사항:

- [x] 통합 알림 페이지 생성
- [x] 홈 화면 알림 아이콘 추가
- [x] 알림 배지 표시
- [x] 공지사항 탭 통합
- [x] 테스트 스크립트 작성
- [ ] 실제 데이터로 테스트
- [ ] RLS 정책 확인
- [ ] 푸시 알림 연동 확인
- [ ] 다양한 알림 유형 테스트

---

## 🎉 결론

**3단계 알림 시스템 완성!**

1. 📲 **푸시 알림** (즉시 수신)
2. 🏠 **홈 화면 배너** (추가결제 강조)
3. 🔔 **통합 알림 센터** (모든 알림 한 곳에서)

**놓칠 수 없는 UX!** ✨

