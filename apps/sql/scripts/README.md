# 집배코드 DB Import 가이드

전국 34,396개 우편번호의 집배코드를 Supabase에 import하는 방법입니다.

## 📋 사전 준비

1. **CSV 파일 확인**
   - 파일 위치: `apps/sql/data/delivery-codes-all.csv`
   - 총 34,396개 우편번호 포함

2. **Supabase 테이블 생성**
   - SQL Editor에서 `apps/sql/migrations/20251202_create_delivery_codes_table.sql` 실행
   - 또는 Supabase CLI: `supabase db push`

## 🚀 Import 방법

### 방법 1: Node.js 스크립트 (권장)

```bash
# 프로젝트 루트에서 실행
cd apps/sql/scripts

# 환경변수 설정
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 또는 .env 파일에 설정 후
node import-delivery-codes.js
```

### 방법 2: Supabase Dashboard (가장 간단)

1. Supabase Dashboard 접속
2. Table Editor > `delivery_codes` 테이블 선택
3. "Import data from CSV" 클릭
4. `apps/sql/data/delivery-codes-all.csv` 파일 업로드
5. 컬럼 매핑 확인:
   - zipcode → zipcode
   - sort_code_1 → sort_code_1
   - sort_code_2 → sort_code_2
   - sort_code_3 → sort_code_3
   - sort_code_4 → sort_code_4
   - arr_cnpo_nm → arr_cnpo_nm
   - deliv_po_nm → deliv_po_nm
   - course_no → course_no
6. Import 실행

### 방법 3: SQL COPY 명령 (psql)

```bash
psql "postgresql://[user]:[password]@[host]:[port]/[database]" \
  -c "COPY delivery_codes (zipcode, sort_code_1, sort_code_2, sort_code_3, sort_code_4, arr_cnpo_nm, deliv_po_nm, course_no) 
      FROM '/absolute/path/to/delivery-codes-all.csv' 
      WITH (FORMAT csv, HEADER true);"
```

## ✅ Import 확인

```sql
-- 총 데이터 개수 확인
SELECT COUNT(*) FROM delivery_codes;
-- 예상 결과: 34396

-- 샘플 데이터 확인
SELECT * FROM delivery_codes WHERE zipcode = '41100';
-- 예상 결과: 경1, 701, 56, 05, 대구M, 동대구, 560

-- 대구 지역 샘플
SELECT * FROM delivery_codes WHERE zipcode LIKE '41%' LIMIT 10;
```

## 🎯 사용 방법

Import 완료 후, Edge Function에서 자동으로 Supabase 테이블을 조회합니다:

```typescript
// shipments-create-outbound/index.ts
// 자동으로 우선순위:
// 1. Supabase DB 조회 (34,396개 우편번호)
// 2. 로컬 매핑 (fallback)
// 3. 우체국 API (최종 fallback)
```

## 📊 데이터 구조

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| zipcode | VARCHAR(5) | 우편번호 | 41100 |
| sort_code_1 | VARCHAR(10) | 집중국번호 | 경1 |
| sort_code_2 | VARCHAR(10) | 배달국번호 | 701 |
| sort_code_3 | VARCHAR(10) | 집배팀번호 | 56 |
| sort_code_4 | VARCHAR(10) | 집배구번호 | 05 |
| arr_cnpo_nm | VARCHAR(50) | 집중국명 | 대구M |
| deliv_po_nm | VARCHAR(50) | 배달국명 | 동대구 |
| course_no | VARCHAR(10) | 구분코스 | 560 |

## 🔄 데이터 업데이트

우체국에서 집배코드 DB가 업데이트되면:

1. 새로운 CSV 파일 다운로드
2. `apps/sql/data/delivery-codes-all.csv` 교체
3. Import 스크립트 재실행 (upsert로 중복 처리됨)

