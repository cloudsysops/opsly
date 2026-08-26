import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManualPageRedirect({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  redirect(`/portal/learning/manual/${pageId}`);
}
