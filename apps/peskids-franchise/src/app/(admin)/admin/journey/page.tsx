import { redirect } from "next/navigation";

export default function JourneyOverviewRedirect() {
  redirect("/admin/learning/progress");
}
