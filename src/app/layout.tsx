import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Edinho Chaves Tattoo | Gestão do Estúdio',
  description: 'Gestão profissional de tatuagem, piercing e financeiro.'
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
