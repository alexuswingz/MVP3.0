import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SimpleToaster } from '@/lib/toast';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'N-GOOS - Never Go Out Of Stock',
  description: 'Inventory forecasting and shipment management platform for Amazon FBA sellers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans overflow-x-hidden`}>
        {children}
        <SimpleToaster />
      </body>
    </html>
  );
}
