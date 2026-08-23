import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProgramBuilderRedirect() {
  redirect("/admin/learning/programs");
}
