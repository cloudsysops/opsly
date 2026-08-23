import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AdminProgramsRedirect() {
  redirect("/admin/learning/programs");
}
