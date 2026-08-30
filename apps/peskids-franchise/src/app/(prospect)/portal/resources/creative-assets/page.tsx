import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CreativeAssetsRedirect() {
  redirect("/portal/learning/creative-assets");
}
