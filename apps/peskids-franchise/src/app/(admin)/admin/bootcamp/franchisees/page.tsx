import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AdminFranchiseesRedirect() {
  redirect("/admin/learning/franchisees");
}
