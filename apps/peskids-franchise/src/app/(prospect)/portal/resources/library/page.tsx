import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LibraryRedirect() {
  redirect("/portal/learning");
}
