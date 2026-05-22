import { FormBuilderPage } from '@/components/forms/FormBuilderPage';

interface CreateFormPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CreateFormPage({ params }: CreateFormPageProps) {
  const { tenantSlug } = await params;

  return (
    <main className="min-h-screen bg-ops-dark p-6">
      <div className="mx-auto max-w-7xl">
        <FormBuilderPage tenantSlug={tenantSlug} />
      </div>
    </main>
  );
}
