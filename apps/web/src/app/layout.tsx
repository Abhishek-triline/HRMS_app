import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexora HRMS',
  description: 'Complete HR platform for Nexora Technologies Pvt. Ltd.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" data-locale="en-IN" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-body bg-offwhite text-charcoal min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
