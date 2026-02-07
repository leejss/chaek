export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="h-screen w-full">{children}</main>
    </div>
  );
}
