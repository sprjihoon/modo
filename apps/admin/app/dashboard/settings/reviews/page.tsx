import { redirect } from "next/navigation";

export default function ReviewPointSettingsRedirectPage() {
  redirect("/dashboard/points?tab=reviews");
}
