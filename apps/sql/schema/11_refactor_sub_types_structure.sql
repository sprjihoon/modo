-- ============================================
-- 세부 타입과 세부 부위를 통합 관리
-- ============================================

-- 1. repair_types 테이블 수정
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS has_sub_types BOOLEAN DEFAULT false,
  DROP COLUMN IF EXISTS sub_type; -- sub_type은 이제 repair_sub_parts로 관리

-- sub_type이 있던 항목들을 has_sub_types=true로 변경하고, 
-- 각 sub_type을 repair_sub_parts로 이동해야 함

-- 2. repair_sub_parts 테이블에 type 컬럼 추가
ALTER TABLE public.repair_sub_parts
  ADD COLUMN IF NOT EXISTS part_type TEXT DEFAULT 'sub_part';

-- part_type 값:
-- 'sub_type': 세부 타입 (예: 기본형, 단추구멍형, 지퍼형)
-- 'sub_part': 세부 부위 (예: 앞섶, 뒤판, 왼팔, 오른팔)

COMMENT ON COLUMN public.repair_sub_parts.part_type IS '부위 종류: sub_type(세부타입) 또는 sub_part(세부부위)';

-- 3. 기존 데이터 정리 예시
-- 예: "소매기장 줄임 - 기본형", "소매기장 줄임 - 단추구멍형" → "소매기장 줄임" 1개로 통합

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_repair_sub_parts_part_type ON public.repair_sub_parts(part_type);

-- 5. 제약 조건 수정
ALTER TABLE public.repair_sub_parts
  DROP CONSTRAINT IF EXISTS repair_sub_parts_unique,
  ADD CONSTRAINT repair_sub_parts_unique UNIQUE (repair_type_id, name, part_type);


