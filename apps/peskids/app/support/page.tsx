import { redirect } from 'next/navigation'

export default function SupportIndexPage(): never {
  redirect('/support/login')
}
