import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';

/**
 * Security defense mode reuses the technical dashboard while keeping
 * a stable public route for QA and bookmarked links.
 */
export default function SecurityDefenseDashboardPage(): ReactElement {
  redirect('/dashboard/developer');
}
