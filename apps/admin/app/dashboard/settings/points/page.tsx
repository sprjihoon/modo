import { redirect } from "next/navigation";

export default function PointSettingsRedirectPage() {
  redirect("/dashboard/points?tab=settings");
}
