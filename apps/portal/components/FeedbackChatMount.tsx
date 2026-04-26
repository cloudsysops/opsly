'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { usePortalTenant } from '@/hooks/usePortalTenant';
import { FeedbackChat } from '@/components/FeedbackChat';

export function FeedbackChatMount() {
  const { data, error, isLoading } = usePortalTenant();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: u }) => {
      setEmail(u.user?.email ?? '');
    });
  }, []);

  if (isLoading || error || !data?.slug || !email) {
    return null;
  }

  return <FeedbackChat tenantSlug={data.slug} userEmail={email} />;
}
