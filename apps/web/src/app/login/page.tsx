import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SignInButton } from '@/components/sign-in-button';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <main>
      <h1>Jarvis Content</h1>
      <SignInButton />
    </main>
  );
}
