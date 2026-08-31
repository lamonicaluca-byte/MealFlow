import { RequireAuth } from "@/components/layout/require-auth";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh">
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <OfflineBanner />
          <main className="flex-1 pb-safe-nav md:pb-8">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">{children}</div>
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </RequireAuth>
  );
}
