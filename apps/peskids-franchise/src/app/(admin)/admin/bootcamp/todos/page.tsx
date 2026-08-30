import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function AdminTodosRedirect() {
  redirect("/admin/learning/todos");
}
