import type { Metadata } from "next";
import { Inter, Libre_Baskerville, BBH_Sans_Hegarty } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  display: "swap",
});

const bbhSansHegarty = BBH_Sans_Hegarty({
  weight: ["400"],
  variable: "--font-bbh-sans-hegarty",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookMaker",
  description: "AI-assisted book creation studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${inter.variable} ${libreBaskerville.variable} ${bbhSansHegarty.variable} antialiased`}
      lang="en"
    >
      <body>{children}</body>
    </html>
  );
}
