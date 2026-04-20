-- 배송비 글로벌 설정 (싱글톤 테이블)
-- 관리자가 기본 왕복배송비와 도서산간 추가 배송비를 변경할 수 있도록 한다.

CREATE TABLE IF NOT EXISTS shipping_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_shipping_fee INTEGER NOT NULL DEFAULT 7000,
  remote_area_fee INTEGER NOT NULL DEFAULT 400,
  return_shipping_fee INTEGER NOT NULL DEFAULT 7000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

COMMENT ON TABLE shipping_settings IS '배송비 글로벌 설정 (싱글톤, id=1)';
COMMENT ON COLUMN shipping_settings.base_shipping_fee IS '기본 왕복배송비 (원, 기본 7000)';
COMMENT ON COLUMN shipping_settings.remote_area_fee IS '도서산간 추가 배송비 (원, 기본 400)';
COMMENT ON COLUMN shipping_settings.return_shipping_fee IS '반송 시 차감되는 왕복배송비 (원, 기본 7000)';

-- 기본 행 삽입
INSERT INTO shipping_settings (id, base_shipping_fee, remote_area_fee, return_shipping_fee)
VALUES (1, 7000, 400, 7000)
ON CONFLICT (id) DO NOTHING;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_shipping_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipping_settings_updated_at ON shipping_settings;
CREATE TRIGGER trg_shipping_settings_updated_at
  BEFORE UPDATE ON shipping_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_shipping_settings_updated_at();

-- RLS: 모두 읽기 가능 (주문 흐름에서 anon/authenticated 모두 필요)
ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_settings_read_all" ON shipping_settings;
CREATE POLICY "shipping_settings_read_all"
  ON shipping_settings
  FOR SELECT
  USING (true);

-- 쓰기는 service_role만 (관리자 페이지에서만 호출)
-- 별도 INSERT/UPDATE 정책을 만들지 않으면 anon/authenticated는 불가, service_role은 RLS bypass
