# 📢 관리자 공지사항 시스템 가이드

## 🎯 개요

관리자 페이지에서 **공지사항 작성 및 전체 푸시 발송** 기능이 완벽하게 구현되어 있습니다.

**경로**: `/dashboard/notifications/announcements`

---

## ✨ 주요 기능

### **1️⃣ 공지사항 작성**
- ✅ 제목 및 내용 작성
- ✅ 유형 선택 (일반/긴급/점검/프로모션)
- ✅ 이미지 첨부 (URL)
- ✅ 링크 첨부 (상세 페이지 URL)

### **2️⃣ 푸시 발송 옵션** ⭐
```typescript
send_push: boolean  // ✅ 전체 푸시 또는 조용히 게시 선택
```

**선택 가능:**
- ✅ **푸시 알림 발송** (체크) → 전체 고객에게 FCM 푸시
- ⬜ **푸시 알림 발송** (체크 해제) → 조용히 게시만

### **3️⃣ 발송 대상 선택**
```typescript
target_audience: string
```

| 옵션 | 설명 | 대상 |
|------|------|------|
| **all** | 전체 사용자 | 모든 가입자 |
| **active_users** | 활성 사용자 | 30일 내 활동 |
| **recent_orders** | 최근 주문자 | 7일 내 주문 |

### **4️⃣ 추가 옵션**
- 📌 **상단 고정** (`is_pinned`) - 공지사항 목록 최상단에 고정
- 🖼️ **이미지 첨부** (`image_url`) - 공지사항에 이미지 표시
- 🔗 **링크 첨부** (`link_url`) - "자세히 보기" 버튼 링크

---

## 🔄 워크플로우

### **시나리오 1: 전체 푸시 발송**
```
1. [관리자] 새 공지사항 버튼 클릭
   ↓
2. [작성 화면]
   - 제목: "🎉 신년 맞이 특별 이벤트"
   - 내용: "모든 수선 20% 할인!"
   - 유형: 프로모션
   - 대상: 전체 사용자
   - ✅ 푸시 알림 발송 (체크)
   - ✅ 상단 고정
   ↓
3. [저장] → 상태: draft (임시저장)
   ↓
4. [발송 버튼 클릭]
   → 확인 다이얼로그: "전체 고객에게 발송하시겠습니까?"
   ↓
5. [확인]
   → Edge Function 호출: send-announcement-push
   → FCM 푸시 발송
   ↓
6. [발송 완료]
   - 상태: sent
   - 총 1,234명
   - 성공: 1,200명
   - 실패: 34명
```

---

### **시나리오 2: 조용히 게시 (푸시 없음)**
```
1. [관리자] 새 공지사항 버튼 클릭
   ↓
2. [작성 화면]
   - 제목: "📢 서비스 이용 안내"
   - 내용: "고객센터 운영 시간 안내"
   - 유형: 일반
   - ⬜ 푸시 알림 발송 (체크 해제) ⭐
   ↓
3. [저장]
   → announcements 테이블에만 저장
   → 푸시 발송 없음
   ↓
4. [결과]
   - 앱의 공지사항 탭에만 표시
   - 푸시 알림 없음 (조용히 게시)
```

---

## 📱 관리자 UI 구조

### **공지사항 목록**
```
┌────────────────────────────────────────────────┐
│  공지사항 관리              [새 공지사항]      │
│  공지사항을 작성하고 전체 고객에게 푸시 발송   │
├────────────────────────────────────────────────┤
│ 제목      │첨부│유형 │상태│대상│발송통계│작성일│
├────────────────────────────────────────────────┤
│ 📌 긴급 공지 │🖼️ │긴급│발송│전체│1,200명 │12.22│
│   시스템 점검│    │    │완료│    │성공:1,150│     │
│             │    │    │    │    │실패:50  │[편집][삭제]│
├────────────────────────────────────────────────┤
│ 신년 이벤트  │🔗 │프로│임시│전체│   -    │12.21│
│             │    │모션│저장│    │        │[편집][발송][삭제]│
└────────────────────────────────────────────────┘
```

---

### **작성/편집 모달**
```
┌──────────────────────────────────────┐
│  새 공지사항                    [X]   │
├──────────────────────────────────────┤
│  제목 *                              │
│  ┌────────────────────────────────┐  │
│  │ 공지사항 제목                  │  │
│  └────────────────────────────────┘  │
│                                      │
│  내용 *                              │
│  ┌────────────────────────────────┐  │
│  │ 공지사항 내용...               │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  유형              발송 대상          │
│  [일반 ▼]          [전체 사용자 ▼]   │
│                                      │
│  이미지 URL (선택)                   │
│  ┌────────────────────────────────┐  │
│  │ https://example.com/image.jpg  │  │
│  └────────────────────────────────┘  │
│                                      │
│  링크 URL (선택)                     │
│  ┌────────────────────────────────┐  │
│  │ https://example.com/detail     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ✅ 푸시 알림 발송    ⭐ 핵심 기능   │
│  ✅ 상단 고정                        │
│                                      │
│              [취소]  [저장]          │
└──────────────────────────────────────┘
```

---

## 🔧 핵심 코드

### **1. 푸시 발송 여부 체크박스**

```62:63:modo/apps/admin/app/dashboard/notifications/announcements/page.tsx
      send_push: true,
      target_audience: 'all',
```

```494:509:modo/apps/admin/app/dashboard/notifications/announcements/page.tsx
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="send_push"
                    checked={editingAnnouncement.send_push || false}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        send_push: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="send_push" className="ml-2 block text-sm text-gray-900">
                    푸시 알림 발송
                  </label>
                </div>
```

---

### **2. 발송 대상 선택**

```437:454:modo/apps/admin/app/dashboard/notifications/announcements/page.tsx
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">발송 대상</label>
                  <select
                    value={editingAnnouncement.target_audience || 'all'}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        target_audience: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">전체 사용자</option>
                    <option value="active_users">활성 사용자 (30일 내)</option>
                    <option value="recent_orders">최근 주문자 (7일 내)</option>
                  </select>
                </div>
```

---

### **3. 푸시 발송 로직**

```138:179:modo/apps/admin/app/dashboard/notifications/announcements/page.tsx
  const handleSendPush = async (announcement: Announcement) => {
    if (!announcement.send_push) {
      alert('푸시 알림 발송이 비활성화되어 있습니다')
      return
    }

    if (
      !confirm(
        `공지사항을 전체 고객에게 발송하시겠습니까?\n대상: ${getTargetAudienceName(announcement.target_audience)}`
      )
    ) {
      return
    }

    try {
      setIsSending(true)

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('send-announcement-push', {
        body: {
          announcementId: announcement.id,
          title: announcement.title,
          content: announcement.content,
          targetAudience: announcement.target_audience,
          imageUrl: announcement.image_url,
          linkUrl: announcement.link_url,
        },
      })

      if (error) throw error

      alert(
        `푸시 알림 발송 완료!\n총 ${data.total}명 중 ${data.success}명 성공, ${data.failed}명 실패`
      )
      loadAnnouncements()
    } catch (error: any) {
      console.error('푸시 발송 실패:', error)
      alert(error.message || '푸시 발송에 실패했습니다')
    } finally {
      setIsSending(false)
    }
  }
```

---

## 📊 데이터베이스 스키마

### **announcements 테이블**
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,                  -- general, urgent, maintenance, promotion
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  send_push BOOLEAN DEFAULT true,       -- ⭐ 푸시 발송 여부
  target_audience TEXT DEFAULT 'all',   -- all, active_users, recent_orders
  is_pinned BOOLEAN DEFAULT false,
  
  image_url TEXT,
  link_url TEXT,
  
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  total_recipients INTEGER DEFAULT 0,
  push_sent_count INTEGER DEFAULT 0,
  push_failed_count INTEGER DEFAULT 0,
  
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 상태 흐름

```
draft (임시저장)
  ↓ [발송 버튼 클릭]
sending (발송 중)
  ↓ [Edge Function 실행]
  ├─ sent (발송 완료) ✅
  └─ failed (발송 실패) ❌
```

**상태 설명:**
- `draft`: 작성 완료, 발송 전
- `sending`: 푸시 발송 진행 중
- `sent`: 푸시 발송 완료
- `failed`: 푸시 발송 실패

---

## 🔍 동작 원리

### **1. 조용히 게시 (send_push = false)**
```
[관리자] 저장
  ↓
announcements 테이블에만 INSERT
  ↓
status = 'sent'로 자동 변경
  ↓
[고객 앱] 공지사항 탭에만 표시
  ↓
푸시 알림 없음 ✅
```

---

### **2. 전체 푸시 (send_push = true)**
```
[관리자] 발송 버튼 클릭
  ↓
send-announcement-push Edge Function 호출
  ↓
1. target_audience에 따라 사용자 조회
   - all: 모든 사용자
   - active_users: 30일 내 활동
   - recent_orders: 7일 내 주문
  ↓
2. FCM 토큰이 있는 사용자 필터링
  ↓
3. 각 사용자에게 FCM 푸시 발송
  ↓
4. announcements 테이블 업데이트:
   - status = 'sent'
   - sent_at = NOW()
   - total_recipients = 1234
   - push_sent_count = 1200
   - push_failed_count = 34
  ↓
[고객 앱]
  - 푸시 알림 수신 ✅
  - 공지사항 탭에도 표시 ✅
```

---

## 📱 고객이 받는 알림

### **푸시 알림 (send_push = true)**
```
┌─────────────────────────────────────┐
│ 🧵 모두리페어              방금 전   │
│                                     │
│ 🎉 신년 맞이 특별 이벤트            │
│ 모든 수선 20% 할인!                 │
│                                     │
│            [닫기]          [열기]    │
└─────────────────────────────────────┘
```

### **앱 내 공지사항 (항상 표시)**
```
┌─────────────────────────────────────┐
│  공지사항                            │
├─────────────────────────────────────┤
│  📌 🚨 긴급 공지: 시스템 점검        │
│     2025.01.01                      │
├─────────────────────────────────────┤
│  🎉 신년 맞이 특별 이벤트           │
│     2024.12.21                      │
└─────────────────────────────────────┘
```

---

## ✅ 핵심 정리

### **푸시 발송 선택 기능 ✅**
```typescript
✅ send_push: true   → 전체 푸시 발송 + 공지사항 게시
⬜ send_push: false  → 조용히 공지사항만 게시 (푸시 없음)
```

### **발송 대상 선택 가능 ✅**
```typescript
target_audience: 'all'            → 전체 사용자
target_audience: 'active_users'   → 활성 사용자 (30일 내)
target_audience: 'recent_orders'  → 최근 주문자 (7일 내)
```

### **추가 옵션 ✅**
- 📌 상단 고정 (`is_pinned`)
- 🖼️ 이미지 첨부 (`image_url`)
- 🔗 링크 첨부 (`link_url`)
- 🏷️ 유형 선택 (일반/긴급/점검/프로모션)

---

## 🎉 결론

**완벽하게 구현되어 있습니다!** ✅

1. ✅ **공지사항 작성** - 제목, 내용, 이미지, 링크
2. ✅ **푸시 선택** - 전체 푸시 또는 조용히 게시
3. ✅ **대상 선택** - 전체/활성/최근 주문자
4. ✅ **상단 고정** - 중요 공지 고정
5. ✅ **발송 통계** - 성공/실패 건수 추적
6. ✅ **알림 템플릿** - 템플릿 관리 페이지

**관리자는 완전한 제어권을 가지고 있습니다!** 🚀

