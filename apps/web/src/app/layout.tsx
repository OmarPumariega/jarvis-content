import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jarvis Content',
  description: 'Automatización de contenido vertical con IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
