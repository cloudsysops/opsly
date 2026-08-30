import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminKBNewRedirect() {
  redirect("/admin/learning/knowledge-base/new");
}
