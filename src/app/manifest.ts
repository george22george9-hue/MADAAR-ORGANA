import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'أورجانا — كنيسة مارجرجس بسندبيس',
    short_name: 'أورجانا',
    description: 'منظومة إدارة خدمة الكنيسة ومدارس الأحد • كنيسة الشهيد العظيم مارجرجس بسندبيس',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F4F3',
    theme_color: '#702C3B',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
