import { EnrollmentPublicForm } from '@/components/enrollment/enrollment-form';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function MatriculaPage({ params }: PageProps): Promise<React.ReactElement> {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-pk-bg px-4 py-10">
      <EnrollmentPublicForm token={token} />
    </main>
  );
}
