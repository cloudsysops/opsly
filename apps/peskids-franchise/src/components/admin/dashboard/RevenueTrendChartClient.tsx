'use client';

import dynamic from 'next/dynamic';

const RevenueTrendChart = dynamic(() => import('./RevenueTrendChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-navy" />
    </div>
  ),
});

export default RevenueTrendChart;
