import { Ma_Shan_Zheng, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

export const fontDisplay = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-mashan",
});

export const fontSerif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-noto-serif",
});

export const fontSans = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-noto-sans",
});
