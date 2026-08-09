import { redirect } from 'next/navigation';

/** Alias Moon → legacy settings */
export default function MoonSettingsPage(): never {
  redirect('/settings');
}
