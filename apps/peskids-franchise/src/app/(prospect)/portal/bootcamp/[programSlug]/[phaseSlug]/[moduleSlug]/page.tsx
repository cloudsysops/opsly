import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ModuleRedirect({ params }: { params: Promise<{ programSlug: string; phaseSlug: string; moduleSlug: string }> }) {
  const { programSlug, phaseSlug, moduleSlug } = await params;
  redirect(`/portal/learning/${programSlug}/${phaseSlug}/${moduleSlug}`);
}
