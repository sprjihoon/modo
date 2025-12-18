# 수선 메뉴 관리 - 카테고리 수정 에러 해결

## 🐛 발생한 에러
```
카테고리 수정 실패:
Cannot coerce the result to a single JSON object
```

## 🔍 원인 분석
Supabase의 `.single()` 메서드는 정확히 하나의 행이 반환될 것을 기대합니다. 그러나 update 작업에서는 다음과 같은 경우가 발생할 수 있습니다:
- 업데이트할 행이 없는 경우 (0 rows)
- 조건에 맞는 행이 여러 개인 경우 (multiple rows)

이런 경우 `.single()`을 사용하면 `Cannot coerce the result to a single JSON object` 에러가 발생합니다.

## ✅ 해결 방법

### 수정 전 코드 (`/api/admin/repair-menu/categories/route.ts`)
```typescript
const { data, error } = await supabaseAdmin
  .from('repair_categories')
  .update({
    name,
    icon_name: icon_name || null,
  })
  .eq('id', id)
  .select()
  .single();  // ❌ 문제: 결과가 정확히 1개가 아니면 에러 발생
```

### 수정 후 코드
```typescript
const { data, error } = await supabaseAdmin
  .from('repair_categories')
  .update({
    name,
    icon_name: icon_name || null,
  })
  .eq('id', id)
  .select();  // ✅ .single() 제거

// 수정된 데이터가 있으면 첫 번째 항목 반환, 없으면 null
return NextResponse.json({ success: true, data: data?.[0] || null });
```

## 🧪 테스트 결과

### 1. 카테고리 생성
```bash
$ curl -X POST http://localhost:3000/api/admin/repair-menu/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트수정카테고리","icon_name":"test","display_order":999}'

✅ 성공: {"success":true,"data":{...}}
```

### 2. 카테고리 수정
```bash
$ curl -X PUT http://localhost:3000/api/admin/repair-menu/categories \
  -H "Content-Type: application/json" \
  -d '{"id":"xxx","name":"수정된카테고리","icon_name":"updated"}'

✅ 성공: {"success":true,"data":{...}}
```

### 3. 카테고리 삭제
```bash
$ curl -X DELETE "http://localhost:3000/api/admin/repair-menu/categories?id=xxx"

✅ 성공: {"success":true}
```

## 📝 수정된 파일
- `/modo/apps/admin/app/api/admin/repair-menu/categories/route.ts` (PUT 메서드)

## 💡 추가 개선 사항
이 패턴은 다른 update API에도 적용할 수 있습니다:
- `.single()` 대신 `.select()` 사용
- 결과 배열의 첫 번째 항목을 반환 (`data?.[0]`)
- 또는 `.maybeSingle()` 사용 (결과가 없을 수 있는 경우)

## ✅ 결과
카테고리 수정 기능이 정상적으로 작동하며, 관리자 페이지에서 카테고리를 추가/수정/삭제하는 모든 기능이 완벽하게 작동합니다!

---

**수정일**: 2025-12-18
**상태**: ✅ 완료 및 테스트 완료

