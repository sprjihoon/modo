INSERT INTO public.company_info (
  company_name,
  ceo_name,
  business_number,
  online_business_number,
  address,
  phone,
  email,
  privacy_officer,
  header_title,
  footer_header
) VALUES (
  '주식회사 모두의수선',
  '홍길동',
  '123-45-67890',
  '2024-서울강남-0000',
  '서울특별시 강남구 테헤란로 123',
  '1588-0000',
  'help@modusrepair.com',
  '김철수',
  '모두의수선',
  '모두의 수선'
) ON CONFLICT DO NOTHING;

