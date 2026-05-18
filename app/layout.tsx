import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: '노베이스구조대 - 누구나 할 수 있는 온라인 강의',
  description: '프로그래밍 경험이 없어도 괜찮아요. 노베이스구조대와 함께 시작하세요.',
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
