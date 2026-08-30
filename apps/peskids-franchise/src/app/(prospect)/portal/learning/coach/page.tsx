import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CoachRedirect() {
  redirect("/portal/learning");
}
