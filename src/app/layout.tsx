import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { fontDisplay, fontSerif, fontSans } from "@/lib/fonts";
import "./globals.css";

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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" theme="dark" duration={4200} gap={8} />
      </body>
    </html>
  );
}
