import { PublicLayout } from "@/components/shared/Layout";
import { EarlChatWidget } from "@/components/marketing/EarlChatWidget";
import { StickyRequestInfo } from "@/components/marketing/StickyRequestInfo";

export default function PublicPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
      {children}
      <EarlChatWidget />
      <StickyRequestInfo />
    </PublicLayout>
  );
}
