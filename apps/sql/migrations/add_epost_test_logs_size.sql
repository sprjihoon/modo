-- epost_test_logs 테이블에 소포 규격 관련 컬럼 추가
-- micro_yn: 우체국 API microYn 파라미터 (초소형 여부)
-- size_preset: UI에서 선택한 사이즈 프리셋 (custom, micro, small, medium, large, xlarge)

ALTER TABLE public.epost_test_logs
  ADD COLUMN IF NOT EXISTS micro_yn text DEFAULT 'N' CHECK (micro_yn IN ('Y', 'N'));

ALTER TABLE public.epost_test_logs
  ADD COLUMN IF NOT EXISTS size_preset text;

COMMENT ON COLUMN public.epost_test_logs.micro_yn IS '초소형 여부 (Y/N) - 우체국 API microYn 그대로';
COMMENT ON COLUMN public.epost_test_logs.size_preset IS '사이즈 프리셋: custom | micro | small | medium | large | xlarge';
