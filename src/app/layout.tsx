import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Barlow, Barlow_Condensed } from "next/font/google";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow", display: "swap" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-barlow-condensed", display: "swap" });


export const metadata: Metadata = {
  title: "FitLog",
  description: "Multi-sport training log",
  appleWebApp: { capable: true, title: "FitLog", statusBarStyle: "black" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
