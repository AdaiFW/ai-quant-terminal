import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | AI Stock Platform",
    default: "AI Stock Platform — Intelligence-Driven Market Analysis",
  },
  description:
    "AI-powered stock market analysis platform with real-time data, intelligent insights, and portfolio tracking.",
  keywords: ["stocks", "AI", "trading", "analysis", "portfolio", "market"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Stock Platform",
    description: "Intelligence-driven stock market analysis.",
    url: "https://ai-stock-platform.vercel.app",
    siteName: "AI Stock Platform",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "hsl(240 10% 3.9%)",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={cn("dark", GeistSans.variable, GeistMono.variable)}
      lang="en"
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
