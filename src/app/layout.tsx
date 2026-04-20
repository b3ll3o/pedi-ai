import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';
import { OfflineIndicator } from '@/components/providers/OfflineIndicator';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PediAI - Cardápio Digital',
  description: 'Aplicativo de cardápio digital com suporte offline',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='pt-BR'>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ReactQueryProvider>
          <StoreProvider>
            <ServiceWorkerRegistration />
            <OfflineIndicator />
            {children}
          </StoreProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
