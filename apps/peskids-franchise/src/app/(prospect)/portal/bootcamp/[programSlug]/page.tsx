import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProgramRedirect({ params }: { params: Promise<{ programSlug: string }> }) {
  const { programSlug } = await params;
  redirect(`/portal/learning/${programSlug}`);
}
