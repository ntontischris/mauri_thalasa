import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { POSSidebar } from "@/components/pos/sidebar";
import { Separator } from "@/components/ui/separator";
import { StaffHeader } from "@/components/pos/staff-header";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { Toaster } from "@/components/ui/sonner";
import { CurrentTime } from "@/components/pos/current-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Note: role-based route guarding lives in the middleware
// (lib/supabase/middleware.ts) so redirects happen before the page renders.

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SupabaseProvider>
      <SidebarProvider defaultOpen={true}>
        <POSSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-6" />
            </div>
            <div className="flex items-center gap-3">
              <CurrentTime />
              <Separator orientation="vertical" className="h-6" />
              <StaffHeader />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="top-right" richColors />
    </SupabaseProvider>
  );
}
