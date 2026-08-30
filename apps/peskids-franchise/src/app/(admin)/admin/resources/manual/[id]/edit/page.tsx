import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminManualEditRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/learning/manual/${id}/edit`);
}
