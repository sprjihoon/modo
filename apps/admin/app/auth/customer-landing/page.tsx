import { redirect } from "next/navigation";

// 고객용 인증 콜백은 이제 modo.mom (apps/web)에서 처리됨
export default function CustomerLandingPage() {
  redirect("https://modo.mom");
}
