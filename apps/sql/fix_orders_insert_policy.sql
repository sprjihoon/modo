-- ============================================
-- orders 테이블 INSERT 정책 추가
-- ============================================

-- 인증된 사용자가 자신의 주문을 생성할 수 있도록 허용
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM public.users WHERE auth_id = auth.uid()
  )
);

-- Storage 업로드 정책도 추가 (order-images 버킷)
CREATE POLICY "Authenticated users can upload to order-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-images');

-- Storage 읽기 정책 (Public)
CREATE POLICY "Anyone can view order-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'order-images');

-- Storage 삭제 정책 (인증된 사용자 자신의 파일만)
CREATE POLICY "Users can delete own order-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'order-images');

-- 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('orders')
ORDER BY tablename, policyname;

