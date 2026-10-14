import { redirect } from 'next/navigation';
import { getUser, getStaff } from '../../lib/auth';
import { readJSON, DEFAULT_SETTINGS } from '../../lib/db';
import Portal from './Portal';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const me = await getUser();
  if (!me) redirect('/login');
  const [ann, settings] = await Promise.all([readJSON('announcements', []), readJSON('settings', DEFAULT_SETTINGS)]);
  if (settings.maintenance && !(await getStaff())) {
    return (<div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}><h1>🛠️ Maintenance</h1><p>{settings.maintenanceMessage}</p></div>);
  }
  return (
    <>
      {ann.filter((a) => a.active).map((a) => (<div key={a.id} className={`banner ${a.type}`}>{a.text}</div>))}
      <Portal me={me} />
    </>
  );
}
