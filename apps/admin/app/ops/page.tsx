import { redirect } from "next/navigation";

export default function OpsPage() {
  // ops 메인 페이지는 입고로 리다이렉트
  redirect("/ops/inbound");
}

