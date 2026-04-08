import dynamic from "next/dynamic";

const FeedbackChatMount = dynamic(
  () => import("@/components/FeedbackChatMount").then((m) => m.FeedbackChatMount),
  { ssr: false },
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FeedbackChatMount />
    </>
  );
}
