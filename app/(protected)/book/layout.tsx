import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "book.build",
  description: "AI-assisted book creation studio",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
