import type { Metadata } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const suit = localFont({
  src: "../node_modules/@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2",
  variable: "--font-suit",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chaek Design System",
  description:
    "명확한 작업 흐름과 상태 피드백을 우선하는 Chaek의 제품 디자인 시스템",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${suit.variable} min-h-screen antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}
