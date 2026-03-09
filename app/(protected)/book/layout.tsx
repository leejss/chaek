import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "chaek",
  description: "AI를 이용하여 책을 만들어보세요",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
