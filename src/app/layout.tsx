import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'RP Tech | Accesorios Tecnológicos',
  description: 'Tu tienda de accesorios tecnológicos de confianza en Perú. Los mejores precios en audífonos, cables, cargadores y más.',
  openGraph: {
    title: 'RP Tech | Accesorios Tecnológicos',
    description: 'Tu tienda de accesorios tecnológicos de confianza en Perú.',
    url: 'https://rptech.pe',
    siteName: 'RP Tech',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
        alt: 'RP Tech Logo',
      },
    ],
    locale: 'es_PE',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans bg-[#f8fafc] text-gray-900 antialiased`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
