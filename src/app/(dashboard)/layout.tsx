import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/core/providers/session-provider";
import { requireSession } from "@/lib/supabase/session";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireSession();

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
