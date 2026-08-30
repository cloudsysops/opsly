import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect old journey task URL to unified academy dashboard
export default function TaskRedirect() {
  redirect("/portal/learning");
}
