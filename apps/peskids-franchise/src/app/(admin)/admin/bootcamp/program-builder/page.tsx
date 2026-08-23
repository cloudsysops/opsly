import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AdminProgramBuilderRedirect() {
  redirect("/admin/learning/program-builder");
}
