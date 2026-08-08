import { MobileNavigationProvider } from "@/components/mobile-navigation";
import { SiteHeader } from "@/components/site-header";
import { getCurrentSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export default async function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  return (
    <div className="flex min-h-svh flex-col">
      <MobileNavigationProvider>
        <SiteHeader
          user={
            session
              ? {
                  email: session.user.email,
                  name: session.user.name,
                }
              : null
          }
        />
      </MobileNavigationProvider>
      <main className={cn("flex min-h-0 flex-1 flex-col")}>{children}</main>
    </div>
  );
}
