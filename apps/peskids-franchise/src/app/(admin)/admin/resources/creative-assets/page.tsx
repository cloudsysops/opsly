import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminCreativeAssetsRedirect() {
  redirect("/admin/learning/creative-assets");
}
