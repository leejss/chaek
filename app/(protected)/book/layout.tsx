import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "chaek",
  description: "AI-assisted book creation studio",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
