-- clothing_type ENUM 값 확인
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'clothing_type'
)
ORDER BY enumsortorder;

