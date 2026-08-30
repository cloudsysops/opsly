import { redirect } from "next/navigation";

// Marketing section landing page - redirect to campaigns
export default function MarketingPage() {
  redirect("/admin/marketing/campaigns");
}
