-- ============================================================
-- 마이그레이션: repair-photos 버킷 생성 + media 타입 확장
-- 수선 전(before_photo) / 수선 후(after_photo) 사진 지원
-- ============================================================

-- 1. Supabase Storage 버킷 생성 (repair-photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-photos',
  'repair-photos',
  true,  -- 공개 버킷 (고객이 직접 URL로 접근 가능)
  10485760,  -- 10MB 제한
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Storage RLS 정책: 관리자(service role)만 업로드 가능, 읽기는 공개
-- 업로드: service role 전용 (어드민 서버에서만 호출)
CREATE POLICY "repair-photos 업로드 - service role only"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'repair-photos');

-- 업데이트/삭제: service role 전용
CREATE POLICY "repair-photos 수정/삭제 - service role only"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'repair-photos');

-- 읽기: 누구나 (공개 버킷이므로)
CREATE POLICY "repair-photos 공개 읽기"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'repair-photos');

-- 3. media 테이블 확인 (type 컬럼이 text라면 추가 마이그레이션 불필요)
-- media.type 에 'before_photo', 'after_photo' 값을 사용하기 위한 코멘트 추가
COMMENT ON COLUMN media.type IS
  'inbound_video | outbound_video | work_video | packing_video | before_photo | after_photo';

-- 4. 인덱스 추가 (before/after 사진 조회 성능)
CREATE INDEX IF NOT EXISTS idx_media_type_sequence
  ON media (final_waybill_no, type, sequence);
