import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect old journey URL to unified academy dashboard
export default function JourneyRedirect() {
  redirect("/portal/learning");
}
