'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button onClick={() => signIn('google', { callbackUrl: '/' })}>
      Iniciar sesión con Google
    </button>
  );
}
