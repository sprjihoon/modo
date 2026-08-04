import { redirect } from "next/navigation";

/** 앱과 동일하게 알림 화면의 공지사항 탭으로 통합 */
export default function AnnouncementsPage() {
  redirect("/notifications?tab=announcements");
}
