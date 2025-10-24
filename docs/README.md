# 모두의수선 - 문서

프로젝트 설계 및 개발 가이드 문서입니다.

## 📚 문서 목록

### 1. [아키텍처 설계](architecture.md)
- 시스템 아키텍처
- 핵심 설계 원칙
- 클라이언트/서버 구조
- 데이터 플로우
- 보안 설계
- 영상 처리
- 확장성

### 2. [API 명세](api-spec.md)
- Edge Functions API
- Supabase Database API
- 외부 API 연동
- 푸시 알림
- 테스트 방법

### 3. [데이터베이스 스키마](database-schema.md)
- ER 다이어그램
- 테이블 상세
- 관계 정의
- RLS 정책
- 트리거
- 쿼리 예시
- 성능 최적화

### 4. [배포 가이드](deployment.md)
- 개발/스테이징/프로덕션 환경
- Mobile App 배포
- Admin Web 배포
- Edge Functions 배포
- Database 마이그레이션
- CI/CD 파이프라인
- 모니터링

## 🎯 빠른 시작

### 신규 개발자 온보딩

1. **프로젝트 개요 파악**
   - [루트 README.md](../README.md) 읽기
   - [아키텍처 설계](architecture.md) 이해

2. **개발 환경 설정**
   - [배포 가이드](deployment.md)의 "개발 환경" 섹션 참고
   - 각 앱별 README 확인
     - [Mobile README](../apps/mobile/README.md)
     - [Admin README](../apps/admin/README.md)
     - [Edge README](../apps/edge/README.md)
     - [SQL README](../apps/sql/README.md)

3. **데이터베이스 이해**
   - [데이터베이스 스키마](database-schema.md) 읽기
   - tracking_no 중심 설계 이해

4. **API 사용법**
   - [API 명세](api-spec.md) 참고
   - Postman/Thunder Client로 테스트

## 🏗️ 프로젝트 구조

```
modo/
├── apps/
│   ├── mobile/          # Flutter 고객용 앱
│   ├── admin/           # Next.js 관리자 웹
│   ├── edge/            # Supabase Edge Functions
│   └── sql/             # Postgres DDL
├── docs/                # 📍 이 디렉토리
│   ├── architecture.md
│   ├── api-spec.md
│   ├── database-schema.md
│   ├── deployment.md
│   └── README.md        # 📍 이 파일
├── .gitignore
├── env.example
└── README.md
```

## 🔑 핵심 개념

### tracking_no (송장번호)
모든 데이터의 중심이 되는 식별자입니다.

```
주문 생성 → 결제 → 송장 발급 (tracking_no)
                        ↓
              입고 → 수선 → 출고 → 배송
                        ↓
                    영상/알림
```

### 5단계 주문 상태
1. **BOOKED** - 수거예약 완료
2. **INBOUND** - 입고 완료 (입고 영상)
3. **PROCESSING** - 수선 중
4. **READY_TO_SHIP** - 출고 완료 (출고 영상)
5. **DELIVERED** - 배송 완료

### 데이터 플로우
```
[Mobile] → [Edge Functions] → [Database]
                ↓
        [External APIs]
    (우체국, PortOne, Cloudflare)
```

## 🛠️ 개발 워크플로우

### 1. 새 기능 개발

```bash
# Feature 브랜치 생성
git checkout -b feat/new-feature

# 개발 및 테스트
# ...

# 커밋 (Conventional Commits)
git commit -m "feat: Add new feature"

# Push 및 PR
git push origin feat/new-feature
```

### 2. 커밋 메시지 규칙

```
feat: 새로운 기능
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅
refactor: 리팩토링
test: 테스트 추가
chore: 빌드/설정 변경
```

### 3. 코드 리뷰 체크리스트

- [ ] 타입 정의 명시적으로 작성
- [ ] 에러 핸들링 추가
- [ ] RLS 정책 확인
- [ ] 주석 작성 (WHY 중심)
- [ ] 테스트 작성
- [ ] 성능 고려

## 🧪 테스트 전략

### Mobile (Flutter)
```bash
# 단위 테스트
flutter test

# 통합 테스트
flutter test integration_test
```

### Admin (Next.js)
```bash
# 타입 체크
npm run type-check

# 린트
npm run lint
```

### Edge Functions
```bash
# 로컬 테스트
supabase functions serve

# cURL 테스트
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/shipments-book' \
  --header 'Authorization: Bearer xxx' \
  --data '{}'
```

### Database
```bash
# 마이그레이션 테스트
supabase db reset

# 쿼리 테스트
psql -h localhost -p 54322 -U postgres -d postgres
```

## 📊 다이어그램

### 시스템 아키텍처
[아키텍처 설계](architecture.md) 참고

### ER 다이어그램
[데이터베이스 스키마](database-schema.md) 참고

### 데이터 플로우
[아키텍처 설계](architecture.md)의 "데이터 플로우" 섹션 참고

## 🔐 보안 가이드

### 환경변수 관리
- `.env` 파일은 절대 Git에 커밋하지 않음
- `env.example` 템플릿 사용
- 프로덕션 키는 별도 관리

### RLS 정책
- 모든 테이블에 RLS 적용
- 사용자는 자신의 데이터만 접근
- 관리자 권한 체크

### API 키 보호
- 클라이언트에서는 Anon Key만 사용
- Service Role Key는 Edge Functions에서만
- 외부 API 키는 Edge Functions에서 중계

## 🚀 배포 체크리스트

### 개발 환경
- [ ] 로컬 Supabase 실행
- [ ] 환경변수 설정
- [ ] 의존성 설치

### 스테이징
- [ ] 테스트 앱 빌드
- [ ] Firebase App Distribution 배포
- [ ] Vercel Preview 배포
- [ ] Edge Functions 배포 (develop branch)

### 프로덕션
- [ ] 모든 테스트 통과
- [ ] 환경변수 설정 (프로덕션)
- [ ] Database 마이그레이션
- [ ] Edge Functions 배포 (main branch)
- [ ] Admin Vercel 배포
- [ ] Mobile 앱스토어 배포

## 📞 지원

### 이슈 리포팅
GitHub Issues에 버그/기능 요청 등록

### 문의
프로젝트 관련 문의는 팀 채널 또는 이메일로

## 🔄 문서 업데이트

### 문서 갱신 시점
- 새 기능 추가
- API 변경
- 아키텍처 변경
- 배포 프로세스 변경

### 문서 작성 규칙
- Markdown 사용
- 다이어그램은 코드 블록으로
- 예시 코드 포함
- 버전 정보 명시

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0

