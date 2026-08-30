import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminManualRedirect() {
  redirect("/admin/learning/manual");
}
