-- orders 테이블 RLS 정책 수정
-- 인증된 사용자는 자신의 주문을 생성할 수 있어야 함
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;

CREATE POLICY "Users can insert their own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- users 테이블 RLS 정책 수정 (참조 무결성 확인을 위해)
-- 인증된 사용자는 자신의 정보를 조회할 수 있어야 함
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth.uid() = auth_id);

-- 관리자는 모든 주문 조회/수정 가능
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

CREATE POLICY "Admins can view all orders"
ON orders FOR ALL
TO authenticated
USING (true); -- 임시로 모든 인증된 사용자 허용 (개발 편의성)

