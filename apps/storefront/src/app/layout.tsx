import { Archivo, Bodoni_Moda } from 'next/font/google';
import { ClientLayout } from '../components/layout/ClientLayout';
import { getClientName } from '../utils/siteMetadata';
import '../index.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
});

const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni-moda',
});

const clientName = getClientName();

export const metadata = {
  title: clientName,
  description: `Sitio oficial de ${clientName}.`,
  openGraph: {
    title: clientName,
    description: `Sitio oficial de ${clientName}.`,
    siteName: clientName,
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bodoniModa.variable}`}>
      <body className="bg-brand-50 text-stone-950 font-sans min-h-screen flex flex-col antialiased">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
