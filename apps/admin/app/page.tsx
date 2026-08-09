import { redirect } from 'next/navigation';

/** Opsly Moon home alias — legacy /dashboard remains. */
export default function HomePage(): never {
  redirect('/moon');
}
