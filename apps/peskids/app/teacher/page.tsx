import { redirect } from 'next/navigation'

export default function TeacherIndexPage(): never {
  redirect('/teacher/login')
}
