import { Suspense } from "react";

import { MobileNavigationProvider } from "@/components/mobile-navigation";
import { SiteSidebar, SiteSidebarFallback } from "@/components/site-sidebar";
import { SiteHeader } from "@/components/site-header";
import { getContentProjectNavigation } from "@/lib/content/services/projects";
import { getCurrentSession } from "@/lib/auth/session";
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
    <div className="min-h-svh">
      <MobileNavigationProvider>
        <SiteHeader
          hasContentNavigation={Boolean(session)}
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
      <main className={cn("px-5 sm:px-8", session && "lg:pl-72")}>
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
