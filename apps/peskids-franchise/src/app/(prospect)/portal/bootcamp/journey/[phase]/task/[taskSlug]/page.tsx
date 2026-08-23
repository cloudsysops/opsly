import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function JourneyTaskRedirect({ params }: { params: { phase: string; taskSlug: string } }) {
  redirect(`/portal/learning/journey/${params.phase}/task/${params.taskSlug}`);
}
