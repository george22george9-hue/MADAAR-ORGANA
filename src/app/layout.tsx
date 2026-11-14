import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/context/auth-context';
import { PwaRegistrationAndPrompt } from '@/components/pwa/PwaRegistrationAndPrompt';

export const viewport: Viewport = {
  themeColor: '#702C3B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'ORGANA — منظومة إدارة خدمة مدارس الأحد | كنيسة الشهيد العظيم مارجرجس بسندبيس',
  description: 'ORGANA Church Service & Sunday School Management Platform. Developed by MADAAR Technologies. Every Detail, Organized.',
  applicationName: 'أورجانا',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'أورجانا',
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="أورجانا" />
      </head>
      <body className="min-h-screen bg-[#F7F4F3] text-[#282326] antialiased select-none-text">
        <AuthProvider>
          {children}
          <PwaRegistrationAndPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}

