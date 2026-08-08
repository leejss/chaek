import { Suspense } from "react";

import { MobileNavigationProvider } from "@/components/mobile-navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteSidebar, SiteSidebarFallback } from "@/components/site-sidebar";
import { getCurrentSession } from "@/lib/auth/session";
import { getContentProjectNavigation } from "@/lib/content/services/projects";
import { cn } from "@/lib/utils";

export default async function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  const projects = session
    ? await getContentProjectNavigation(session.user.id)
    : [];

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
        {session ? (
          <Suspense fallback={<SiteSidebarFallback />}>
            <SiteSidebar projects={projects} />
          </Suspense>
        ) : null}
      </MobileNavigationProvider>
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          session && "lg:pl-60",
        )}
      >
        {children}
      </main>
    </div>
  );
}
