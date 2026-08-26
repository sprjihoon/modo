-- 배송중(OUT_FOR_DELIVERY) 알림 템플릿 한글 복구
-- 원인: Windows CLI로 적용되며 한글이 '?'로 저장됨
-- 본 파일은 hex → UTF-8 변환으로 재적용해도 깨지지 않게 한다.

UPDATE public.notification_templates
SET
  template_name = convert_from(decode('ebb0b0ec86a120ec8b9cec9e91', 'hex'), 'UTF8'),
  title = convert_from(decode('ebb0b0ec86a120ec8b9cec9e91', 'hex'), 'UTF8'),
  body = convert_from(
    decode(
      'eca3bcebacb8287b7b6f726465725f6e756d6265727d7d29ec9d9820ec8898ec84a0ec9db420ec9984eba38ceb9098ec96b420eab3a0eab09deb8b98eabb9820ebb0b0ec86a1ec9d8420ec8b9cec9e91ed9688ec8ab5eb8b88eb8ba42e',
      'hex'
    ),
    'UTF8'
  ),
  updated_at = now()
WHERE template_key = 'order_out_for_delivery';
