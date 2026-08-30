import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JourneyTaskRedirect({ params }: { params: Promise<{ phase: string; taskSlug: string }> }) {
  const { phase, taskSlug } = await params;
  redirect(`/portal/learning/journey/${phase}/task/${taskSlug}`);
}
