import { redirect } from 'next/navigation';
import { getUser } from '../../lib/auth';
import { readJSON } from '../../lib/db';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getUser()) redirect('/app');
  const ann = (await readJSON('announcements', [])).filter((a) => a.active);
  return (
    <>
      {ann.map((a) => (<div key={a.id} className={`banner ${a.type}`}>{a.text}</div>))}
      <LoginForm />
    </>
  );
}
