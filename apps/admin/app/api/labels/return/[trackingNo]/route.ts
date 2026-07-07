import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 반송 송장 라벨 리다이렉트
 * GET /api/labels/return/[trackingNo]
 *
 * extra_charge_data.returnLabelUrl 에 저장된 URL을 처리.
 * 우체국 등기 조회/출력 페이지로 리다이렉트한다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingNo: string }> }
) {
  const { trackingNo } = await params;

  if (!trackingNo) {
    return NextResponse.json(
      { error: "운송장번호가 필요합니다." },
      { status: 400 }
    );
  }

  // 우체국 등기우편 조회/출력 페이지로 리다이렉트
  const epostUrl = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}&displayHeader=N`;

  return NextResponse.redirect(epostUrl);
}
