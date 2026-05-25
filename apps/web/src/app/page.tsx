import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <main>
      <h1>Jarvis Content</h1>
      <p>Bienvenido, {session.user?.name}</p>
    </main>
  );
}
