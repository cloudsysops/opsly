import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function KBRedirect() {
  redirect("/portal/learning/knowledge-base");
}
