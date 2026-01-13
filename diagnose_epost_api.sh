#!/bin/bash

# 우체국 API 수거 문제 진단 스크립트
# 작성일: 2024-12-19

echo "======================================"
echo "🔍 우체국 API 수거 문제 진단 시작"
echo "======================================"
echo ""

# 1. 환경 변수 확인
echo "📋 1단계: 환경 변수 확인"
echo "--------------------------------------"

# Supabase Edge Functions Secrets 확인 안내
echo "⚠️  Supabase Dashboard에서 환경 변수를 확인해야 합니다."
echo "    👉 https://supabase.com/dashboard"
echo "    → Settings → Edge Functions → Secrets"
echo ""

echo "필수 환경 변수 (3개):"
echo "  ✅ EPOST_CUSTOMER_ID     (고객번호)"
echo "  ✅ EPOST_API_KEY          (API 인증키)"
echo "  ✅ EPOST_SECURITY_KEY     (보안키, 정확히 16자)"
echo ""

echo "선택 환경 변수:"
echo "  ⏳ EPOST_APPROVAL_NO      (승인번호, 없으면 자동 조회)"
echo "  ⏳ EPOST_OFFICE_SER       (공급지 코드, 없으면 기본값 사용)"
echo ""

read -p "환경 변수 설정이 완료되었나요? (y/n): " env_check
if [ "$env_check" != "y" ]; then
  echo "❌ 환경 변수를 먼저 설정해주세요."
  exit 1
fi

echo "✅ 환경 변수 확인 완료"
echo ""

# 2. Supabase 로그인 확인
echo "📋 2단계: Supabase 로그인 확인"
echo "--------------------------------------"

if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI가 설치되지 않았습니다."
  echo "   설치: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "✅ Supabase CLI 설치됨"

# Supabase 로그인 상태 확인
if ! supabase functions list &> /dev/null; then
  echo "❌ Supabase에 로그인되지 않았습니다."
  echo "   실행: supabase login"
  exit 1
fi

echo "✅ Supabase 로그인 확인됨"
echo ""

# 3. Edge Function 배포 확인
echo "📋 3단계: Edge Function 배포 확인"
echo "--------------------------------------"

echo "Edge Functions 목록:"
supabase functions list | grep shipments-book
echo ""

read -p "shipments-book이 배포되어 있나요? (y/n): " deploy_check
if [ "$deploy_check" != "y" ]; then
  echo "❌ shipments-book Edge Function이 배포되지 않았습니다."
  echo "   배포: cd /Users/jangjihoon/modo && supabase functions deploy shipments-book"
  exit 1
fi

echo "✅ Edge Function 배포 확인됨"
echo ""

# 4. 최근 로그 확인
echo "📋 4단계: 최근 로그 확인"
echo "--------------------------------------"
echo "최근 10개 로그 확인 중..."
echo ""

supabase functions logs shipments-book --limit 10

echo ""
echo "중요 로그 메시지 확인:"
echo "  ✅ '🚀 실제 우체국 API 호출 시작' → 실제 API 호출됨"
echo "  ⚠️  '⚠️ 테스트 모드 또는 보안키 없음' → Mock 모드 (실제 수거 안됨)"
echo "  ❌ 'EPOST_CUSTOMER_ID 환경 변수' → 환경 변수 누락"
echo ""

read -p "로그에서 '🚀 실제 우체국 API 호출'이 보이나요? (y/n): " log_check
if [ "$log_check" != "y" ]; then
  echo "❌ 실제 API가 호출되지 않았습니다."
  echo "   원인:"
  echo "   1. 환경 변수 누락 (EPOST_SECURITY_KEY, EPOST_API_KEY)"
  echo "   2. test_mode가 true로 설정됨"
  echo ""
  echo "해결 방법:"
  echo "   1. Supabase Dashboard에서 환경 변수 확인"
  echo "   2. Flutter 앱에서 testMode: false 확인"
  exit 1
fi

echo "✅ 실제 API 호출 확인됨"
echo ""

# 5. API 응답 확인
echo "📋 5단계: API 응답 확인"
echo "--------------------------------------"
echo "로그에서 다음 값들을 확인하세요:"
echo "  - regiNo (송장번호)"
echo "  - resNo (소포 예약번호)"
echo "  - resDate (예약 일시)"
echo "  - treatStusCd (수거예약 상태)"
echo ""

read -p "regiNo, resNo, resDate가 모두 있나요? (y/n): " api_check
if [ "$api_check" != "y" ]; then
  echo "❌ API 응답이 정상적이지 않습니다."
  echo "   로그를 확인하여 에러 메시지를 찾으세요."
  exit 1
fi

echo "✅ API 응답 정상"
echo ""

# 6. treatStusCd 확인
echo "📋 6단계: 수거예약 상태(treatStusCd) 확인"
echo "--------------------------------------"
echo "treatStusCd 값 의미:"
echo "  00: 신청준비 → ✅ 수거예약 접수됨"
echo "  01: 소포신청 → ✅ 수거예약 정상 등록됨"
echo "  02: 운송장출력 → ✅ 수거원 배정됨"
echo "  03: 집하완료 → ✅ 물품 수거 완료"
echo ""

read -p "treatStusCd가 00, 01, 02, 03 중 하나인가요? (y/n): " treat_check
if [ "$treat_check" != "y" ]; then
  echo "❌ 수거예약 상태가 정상적이지 않습니다."
  echo ""
  echo "다음 스크립트로 수거예약 상태를 확인하세요:"
  echo "  1. check_pickup_status.ts 파일 수정 (orderNo, reqYmd 업데이트)"
  echo "  2. deno run --allow-net --allow-env check_pickup_status.ts"
  echo ""
  echo "또는 우체국 고객센터(1588-1300)에 문의하세요."
  exit 1
fi

echo "✅ 수거예약 상태 정상"
echo ""

# 7. 최종 확인
echo "======================================"
echo "✅ 진단 완료!"
echo "======================================"
echo ""
echo "모든 확인이 완료되었습니다."
echo ""
echo "🎯 다음 단계:"
echo "  1. 실제 수거 테스트 (Flutter 앱에서 testMode: false로 수거 신청)"
echo "  2. 우체국 기사 방문 대기"
echo "  3. 송장번호로 배송 추적:"
echo "     https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={regiNo}"
echo ""
echo "문제가 계속되면:"
echo "  📞 우체국 고객센터: 1588-1300"
echo "  📄 가이드 문서: /Users/jangjihoon/modo/EPOST_TROUBLESHOOTING_GUIDE_20241219.md"
echo ""

