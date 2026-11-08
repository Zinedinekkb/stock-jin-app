// app/manifest.js
// Next.js serves this at /manifest.webmanifest and adds the <link rel="manifest"> tag automatically.
export default function manifest() {
  return {
    name: 'StockPro — ระบบจัดการสต็อก',
    short_name: 'StockPro',
    description: 'ระบบจัดการคลังสินค้าและบุคลากรสำหรับทุกธุรกิจ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f5fa',
    theme_color: '#6355d8',
    lang: 'th',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
