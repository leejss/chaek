import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { SWRConfig } from "swr";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "chaek",
  description: "AI-assisted book creation studio",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${notoSans.variable} ${notoSerif.variable} antialiased`}
      lang="en"
    >
      <body>
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
