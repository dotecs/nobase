import type { Metadata } from 'next';
import Script from 'next/script';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://nobase911.com'),
  title: { default: '노베이스구조대 — 기초부터, 가능성까지.', template: '%s | 노베이스구조대' },
  description: '입학 준비부터 대학 공부, 새로운 도전까지. 나의 출발점에 맞는 배움을 찾아보세요.',
  icons: {
    icon: '/logo_sim_b.ico',
    apple: '/logo_sim_b.png',
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
