import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect legacy journey task pages to the unified academy dashboard
export default function JourneyTaskRedirectPage() {
  redirect("/portal/learning");
}
