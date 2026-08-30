import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminManualNewRedirect() {
  redirect("/admin/learning/manual/new");
}
