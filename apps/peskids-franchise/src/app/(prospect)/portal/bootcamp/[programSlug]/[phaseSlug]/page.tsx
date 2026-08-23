import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PhaseRedirect({ params }: { params: { programSlug: string; phaseSlug: string } }) {
  redirect(`/portal/learning/${params.programSlug}/${params.phaseSlug}`);
}
