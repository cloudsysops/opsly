import { FormViewer } from '@/components/forms/FormViewer';

interface FormPageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params;

  return (
    <main className="bg-ops-dark">
      <FormViewer formId={formId} />
    </main>
  );
}
