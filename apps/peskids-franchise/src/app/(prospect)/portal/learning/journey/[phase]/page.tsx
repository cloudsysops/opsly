import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect legacy journey phase pages to the unified academy dashboard
export default function JourneyPhaseRedirectPage() {
  redirect("/portal/learning");
}
