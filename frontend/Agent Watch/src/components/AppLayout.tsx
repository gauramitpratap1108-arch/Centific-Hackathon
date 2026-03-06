import { AppSidebar, MobileNav } from "./AppSidebar";
import { NewsWidget } from "./NewsWidget";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center">
      <AppSidebar />
      <MobileNav />
      <main className="flex-1 min-w-0 max-w-[600px] border-x border-border">
        {children}
      </main>
      <div className="hidden xl:block w-[350px] pl-7 pt-2">
        <div className="sticky top-2">
          <NewsWidget />
        </div>
      </div>
    </div>
  );
}
