import { redirect } from "next/navigation";

// CRM section landing page - redirect to prospects list
export default function CRMPage() {
  redirect("/admin/crm/prospects");
}
