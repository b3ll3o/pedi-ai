import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';
import { AppInitializer } from '@/components/providers/AppInitializer';
import { OfflineIndicator } from '@/components/providers/OfflineIndicator';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pedi-ai.com';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'PediAI - Cardápio Digital Restaurante | Offline',
    template: '%s | PediAI',
  },
  description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa, Kitchen Display e muito mais. Teste grátis 14 dias.',
  keywords: [
    'cardápio digital',
    'cardapio digital restaurante',
    'QR Code restaurante',
    'pedidos online restaurante',
    'sistema para restaurante',
    'menu digital',
    'pedidos offline',
    'kitchen display',
    'PediAI',
    'cardápio sem internet',
  ],
  authors: [{ name: 'PediAI' }],
  creator: 'PediAI',
  publisher: 'PediAI',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'PediAI',
    title: 'PediAI - Cardápio Digital para Restaurantes | Funciona Offline',
    description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa, Kitchen Display. Teste grátis 14 dias.',
    url: BASE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PediAI - Cardápio Digital',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PediAI - Cardápio Digital Restaurante | Offline',
    description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa, Kitchen Display. Teste grátis 14 dias.',
    images: ['/og-image.png'],
    creator: '@pediai',
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
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
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${BASE_URL}/#website`,
                  url: BASE_URL,
                  name: 'PediAI - Cardápio Digital para Restaurantes',
                  description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa.',
                  publisher: {
                    '@id': `${BASE_URL}/#organization`,
                  },
                },
                {
                  '@type': 'Organization',
                  '@id': `${BASE_URL}/#organization`,
                  name: 'PediAI',
                  url: BASE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: `${BASE_URL}/logo.png`,
                  },
                  sameAs: [
                    'https://twitter.com/pediai',
                    'https://instagram.com/pediai',
                  ],
                },
                {
                  '@type': 'FoodEstablishment',
                  '@id': `${BASE_URL}/#restaurant`,
                  name: 'PediAI',
                  url: BASE_URL,
                  description: 'Cardápio digital que funciona offline para restaurantes',
                  servesCuisine: 'Brasileira',
                  priceRange: '$$',
                  acceptsReservations: true,
                  hasMenu: `${BASE_URL}/menu`,
                },
                {
                  '@type': 'FAQPage',
                  '@id': `${BASE_URL}/#faq`,
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'Preciso de internet para usar?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Não! O Pedi-AI funciona completamente offline. O cliente pode navegar pelo cardápio e fazer o pedido mesmo sem internet. Quando a conexão voltar, tudo é sincronizado automaticamente.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Como os pedidos chegam na cozinha?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Os pedidos aparecem em tempo real no Kitchen Display, uma tela que pode ser usada em tablet ou TV. Você também recebe notificações sonoras para cada novo pedido.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Posso personalizar o cardápio?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Sim! Você pode adicionar fotos, descrições, valores, opções de personalização (como adicionais e removidos), e organizar por categorias. Tudo pelo painel admin.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Funciona com meu sistema de delivery?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'No plano Profissional e Enterprise, oferecemos integração com as principais plataformas de delivery. Também temos API para automações personalizadas.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Como funciona o suporte?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Oferecemos suporte por chat em todos os planos. O plano Profissional tem suporte prioritário, e o Enterprise conta com gerente de conta dedicado.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ReactQueryProvider>
          <StoreProvider>
            <AppInitializer />
            <ServiceWorkerRegistration />
            <OfflineIndicator />
            {children}
          </StoreProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
