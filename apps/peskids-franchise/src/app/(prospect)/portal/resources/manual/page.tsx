import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ManualRedirect() {
  redirect("/portal/learning/manual");
}
