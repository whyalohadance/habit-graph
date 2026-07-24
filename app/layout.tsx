import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const appleFontStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const metadata: Metadata = {
  title: "Habit Graph",
  description: "Track your goals and watch your progress grow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Habit Graph",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="flex min-h-full flex-col bg-[#F5F5F7]"
        style={{ fontFamily: appleFontStack }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
