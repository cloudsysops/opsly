import { AdminShell } from '@/components/admin/admin-shell';
import { ImprovementChatPanel } from '@/components/admin/improvement-chat-panel';

export const metadata = {
  title: 'Peskids · Mejoras',
  description: 'Chat interno para pedir mejoras de la plataforma Peskids',
};

export default function AdminChatPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-pk-border bg-white shadow-card">
        <ImprovementChatPanel />
      </div>
    </AdminShell>
  );
}
