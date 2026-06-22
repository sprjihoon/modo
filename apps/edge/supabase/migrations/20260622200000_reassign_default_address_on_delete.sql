-- 기본 배송지 삭제 시 다른 배송지를 기본으로 승격 (고아 기본 배송지 상태 방지)
CREATE OR REPLACE FUNCTION public.reassign_default_address_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default THEN
    UPDATE public.addresses
    SET is_default = true
    WHERE id = (
      SELECT id
      FROM public.addresses
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reassign_default_address_on_delete_trigger ON public.addresses;

CREATE TRIGGER reassign_default_address_on_delete_trigger
  AFTER DELETE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_default_address_on_delete();
