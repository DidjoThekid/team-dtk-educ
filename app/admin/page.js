import { isAdmin } from '../../lib/auth';
import AdminPanel from './AdminPanel';
import Login from './Login';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default function AdminPage() {
  return isAdmin() ? <AdminPanel /> : <Login />;
}
