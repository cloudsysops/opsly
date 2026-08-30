import { redirect } from "next/navigation";

export default function JourneyTodosRedirect() {
  redirect("/admin/learning/todos");
}
