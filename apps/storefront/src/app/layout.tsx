import { Archivo, Bodoni_Moda } from 'next/font/google';
import { ClientLayout } from '../components/layout/ClientLayout';
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

export const metadata = {
  title: 'Granja La Manzana - Genética de Excelencia',
  description: 'Plataforma oficial de Granja La Manzana. Venta de aves de combate, cría y artículos de primera calidad con garantía genética certificada.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read feature flag for raffles from environment variables
  const showRaffles = process.env.NEXT_PUBLIC_RAFFLE_ENABLED === 'true' || process.env.VITE_RAFFLE_ENABLED === 'true';

  return (
    <html lang="es" className={`${bodoniModa.variable}`}>
      <body className="bg-brand-50 text-stone-950 font-sans min-h-screen flex flex-col antialiased">
        <ClientLayout showRaffles={showRaffles}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
