import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '烂柯棋缘 · 人生模拟器',
  description:
    '一名游方之人的一生:观棋、游历、手谈、坐忘。没有刀兵,只有落子声。种子化骰子,全程可审计,纯前端运行。',
};

export const viewport: Viewport = {
  themeColor: '#070b0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="leaf-grain dusk-vignette min-h-full antialiased">{children}</body>
    </html>
  );
}
