import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '灭运图录 · 人生模拟器',
  description:
    '一部记人气运、也记人劫数的图录。种子化骰子、公开赔率、可推演的未来 —— 以及一条永远在涨的劫运。',
};

export const viewport: Viewport = {
  themeColor: '#06040e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-nebula-2 focus:px-3 focus:py-2 focus:text-star"
        >
          跳至正文
        </a>
        {children}
      </body>
    </html>
  );
}
