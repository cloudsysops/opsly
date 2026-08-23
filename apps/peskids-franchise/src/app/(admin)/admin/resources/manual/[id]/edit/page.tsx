import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminManualEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/learning/manual/${params.id}/edit`);
}
