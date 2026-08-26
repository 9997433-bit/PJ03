import type { Metadata, Viewport } from 'next';
import { fontDisplay, fontBody } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: '烂柯棋缘·人生模拟器',
  description:
    '观棋柯烂,世事如枰。一款清淡的文字人生模拟器：不打不杀,只是走路、看棋、与山精鬼怪对坐——七境之上,汝是子,还是执子的人?',
};

export const viewport: Viewport = {
  themeColor: '#fbfaf3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body className="paper-fiber min-h-dvh antialiased">{children}</body>
    </html>
  );
}
