import { Suspense } from 'react';
import { MoonClientDetailClient } from '@/components/moon/moon-client-detail-client';
import { MoonSkeleton } from '@/components/moon/primitives';
import { loadTenantConfigSummaries } from '@/lib/moon/config-loaders';

export default async function MoonClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const configs = await loadTenantConfigSummaries();
  const match = configs.find((c) => c.slug === slug) ?? null;
  return (
    <Suspense fallback={<MoonSkeleton className="h-48" />}>
      <MoonClientDetailClient
        slug={slug}
        config={
          match
            ? {
                vertical: match.vertical,
                modules_enabled: match.modules_enabled,
                public_url: match.public_url,
                stack_type: match.stack_type,
              }
            : null
        }
      />
    </Suspense>
  );
}
