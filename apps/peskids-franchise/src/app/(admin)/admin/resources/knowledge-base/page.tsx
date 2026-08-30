import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminKBRedirect() {
  redirect("/admin/learning/knowledge-base");
}
