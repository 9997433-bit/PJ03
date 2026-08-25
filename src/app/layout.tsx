import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { fontDisplay, fontSerif, fontSans } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: '凡人修仙传·人生模拟器',
  description:
    '天道为证，仙途自择。一款文字修仙人生模拟器：D100掷骰、灵根天定、突破生死、坊市炼丹——凡人之躯，可否问鼎化神？',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0d0f17',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fontDisplay.variable} ${fontSerif.variable} ${fontSans.variable}`}>
      <body className="paper-grain ink-vignette min-h-dvh bg-ink-950 text-paper-50 antialiased">
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--color-ink-800)',
              border: '1px solid var(--color-ink-600)',
              color: 'var(--color-paper-50)',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </body>
    </html>
  );
}
