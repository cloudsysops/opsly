'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function NativePushRegister(): null {
  useEffect(() => {
    void (async () => {
      const { isNativeApp, registerNativePush } = await import('@/lib/native-push');
      if (!isNativeApp()) return;

      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      await registerNativePush(userId);
    })();
  }, []);

  return null;
}
