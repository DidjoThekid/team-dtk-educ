import { redirect } from 'next/navigation';
import { getStaff } from '../../lib/auth';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Team DTK', robots: { index: false } };

export default async function AdminPage() {
  const s = await getStaff();
  if (!s) redirect('/login');
  return <AdminPanel staff={{ name: s.name, level: s.staff }} />;
}
