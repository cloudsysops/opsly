import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect old journey phase URL to unified academy dashboard
export default function PhaseRedirect() {
  redirect("/portal/learning");
}
