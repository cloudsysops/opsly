import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ManualPageRedirect({ params }: { params: { pageId: string } }) {
  redirect(`/portal/learning/manual/${params.pageId}`);
}
