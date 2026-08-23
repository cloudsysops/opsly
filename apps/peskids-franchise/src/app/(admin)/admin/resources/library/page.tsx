import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminLibraryRedirect() {
  redirect("/admin/learning/library");
}
