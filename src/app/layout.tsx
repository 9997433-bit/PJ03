import type { Metadata, Viewport } from "next";
import { Ma_Shan_Zheng, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// 马善政毛笔楷书 — display calligraphy for the title & realm names
const fontDisplay = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-display",
});

// 思源宋体 — literary serif for 天道 narration
const fontSerif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-serif",
});

// 思源黑体 — UI chrome, stats, buttons
const fontSans = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "凡人修仙传·人生模拟器",
  description:
    "一款纯浏览器端的修仙人生文字模拟器。天道为叙述者，命数由骰子裁定——凡人之躯，能否问鼎大道？",
  keywords: ["修仙", "凡人修仙传", "人生模拟器", "文字游戏", "xianxia"],
  applicationName: "凡人修仙传·人生模拟器",
};

export const viewport: Viewport = {
  themeColor: "#0B0F0E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`dark h-full antialiased ${fontDisplay.variable} ${fontSerif.variable} ${fontSans.variable}`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg,#0B0F0E)] text-[var(--ink-text,#D8D3C4)]">
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          duration={4200}
          gap={8}
          toastOptions={{
            style: {
              background: "var(--surface, #121815)",
              border: "1px solid var(--border, #2A3A32)",
              color: "var(--ink-text, #D8D3C4)",
              fontFamily: "var(--font-serif), serif",
            },
          }}
        />
      </body>
    </html>
  );
}
