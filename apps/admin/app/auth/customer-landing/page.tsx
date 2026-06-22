import { redirect } from "next/navigation";

// 고객용 인증 콜백은 apps/web (modo.io.kr)에서 처리
export default function CustomerLandingPage() {
  redirect("https://modo.io.kr");
}
