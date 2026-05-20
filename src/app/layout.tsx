import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Quant Terminal",
  description: "Institutional AI-powered quantitative trading terminal.",
};

export const viewport: Viewport = {
  themeColor: "#0A0E17",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
