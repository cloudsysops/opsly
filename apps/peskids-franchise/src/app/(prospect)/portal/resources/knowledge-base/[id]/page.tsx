import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function KBArticleRedirect({ params }: { params: { id: string } }) {
  redirect(`/wiki/${params.id}`);
}
