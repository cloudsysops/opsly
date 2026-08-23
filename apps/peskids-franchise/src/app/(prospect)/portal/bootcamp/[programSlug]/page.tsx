import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProgramRedirect({ params }: { params: { programSlug: string } }) {
  redirect(`/portal/learning/${params.programSlug}`);
}
