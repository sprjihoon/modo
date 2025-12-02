# 배경 이미지 컬럼 추가 방법

Supabase SQL Editor가 sandboxed 모드라서 DDL 쿼리를 실행할 수 없습니다. 다음 방법 중 하나를 사용하세요:

## 방법 1: Table Editor 사용 (권장)

1. Supabase Dashboard 접속
2. 왼쪽 메뉴에서 **Table Editor** 클릭
3. `company_info` 테이블 선택
4. 상단의 **Add Column** 버튼 클릭
5. 다음 정보 입력:
   - **Name**: `label_background_image_url`
   - **Type**: `text`
   - **Default value**: (비워두기)
   - **Is nullable**: ✅ 체크
6. **Save** 클릭

## 방법 2: Migration 실행

Supabase CLI를 사용하는 경우:

```bash
supabase migration new add_label_background_image_url
```

생성된 파일에 다음 SQL 추가:
```sql
ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS label_background_image_url TEXT;
```

그리고 실행:
```bash
supabase db push
```

## 방법 3: 직접 SQL 실행 (프로덕션)

프로덕션 환경에서는 Supabase Dashboard의 SQL Editor가 아닌 다른 방법으로 실행해야 합니다.

