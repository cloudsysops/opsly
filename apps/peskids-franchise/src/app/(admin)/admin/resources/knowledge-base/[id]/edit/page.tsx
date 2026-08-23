import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminKBEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/learning/knowledge-base/${params.id}/edit`);
}
