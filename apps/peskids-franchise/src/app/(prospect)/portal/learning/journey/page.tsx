import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect legacy journey dashboard to the unified academy dashboard
export default function JourneyRedirectPage() {
  redirect("/portal/learning");
}
