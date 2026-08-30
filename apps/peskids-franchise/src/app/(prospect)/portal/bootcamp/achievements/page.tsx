import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BootcampAchievementsRedirect() {
  redirect("/portal/learning/achievements");
}
