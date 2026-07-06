-- Storage RLS 정책: repair-photos 버킷
CREATE POLICY "repair-photos service_role insert"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'repair-photos');

CREATE POLICY "repair-photos service_role delete"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'repair-photos');

CREATE POLICY "repair-photos public select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'repair-photos');

-- media 테이블 인덱스 (before/after 사진 조회 성능)
CREATE INDEX IF NOT EXISTS idx_media_type_sequence
  ON media (final_waybill_no, type, sequence);

-- media.type 코멘트
COMMENT ON COLUMN media.type IS
  'inbound_video | outbound_video | work_video | packing_video | before_photo | after_photo';
