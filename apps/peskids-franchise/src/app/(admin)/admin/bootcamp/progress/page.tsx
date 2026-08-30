import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AdminProgressRedirect() {
  redirect("/admin/learning/progress");
}
