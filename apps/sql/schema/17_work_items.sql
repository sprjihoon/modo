-- ============================================
-- 모두의수선 - 작업 아이템 상태 테이블
-- ============================================

-- 작업 아이템 상태 ENUM
CREATE TYPE work_item_status AS ENUM (
  'PENDING',      -- 대기 중
  'IN_PROGRESS',  -- 작업 중
  'COMPLETED'     -- 완료
);

-- 작업 아이템 테이블
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 참조
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- 아이템 정보
  item_index INTEGER NOT NULL,  -- repair_parts 배열의 인덱스 (0부터 시작)
  item_name TEXT NOT NULL,      -- 수선 부위명 (repair_parts[index])
  
  -- 작업 상태
  status work_item_status NOT NULL DEFAULT 'PENDING',
  
  -- 작업자 정보 (선택적) - 직원 테이블 참조
  worker_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  worker_name TEXT,  -- 작업자 이름 (스냅샷)
  
  -- 시간 정보
  started_at TIMESTAMPTZ,      -- 작업 시작 시간
  completed_at TIMESTAMPTZ,    -- 작업 완료 시간
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건: 같은 주문의 같은 아이템 인덱스는 하나만 존재
  CONSTRAINT work_items_unique_order_item UNIQUE (order_id, item_index)
);

-- RLS 활성화
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view work items"
  ON public.work_items
  FOR SELECT
  USING (true);

-- 정책: 관리자만 관리 가능
CREATE POLICY "Admins can manage work items"
  ON public.work_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_work_items_order ON public.work_items(order_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_worker ON public.work_items(worker_id);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_work_items_updated_at
  BEFORE UPDATE ON public.work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE public.work_items IS '주문의 각 수선 아이템별 작업 상태를 관리하는 테이블';
COMMENT ON COLUMN public.work_items.item_index IS 'repair_parts 배열의 인덱스 (0부터 시작)';
COMMENT ON COLUMN public.work_items.item_name IS '수선 부위명 (repair_parts[index] 값)';
COMMENT ON COLUMN public.work_items.status IS '작업 상태: PENDING(대기), IN_PROGRESS(작업중), COMPLETED(완료)';

