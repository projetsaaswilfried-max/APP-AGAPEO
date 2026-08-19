import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/session";
import { signOutAction } from "@/lib/actions/auth.actions";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Compte suspendu",
  robots: { index: false, follow: false }
};

export default async function SuspendedPage() {
  const { user, profile } = await getCurrentSession();

  if (!user || !profile) redirect("/login");
  if (!profile.is_suspended) redirect("/");

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 text-center shadow-2xs select-none">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto">
        <ShieldAlert size={22} />
      </div>
      <div>
        <h2 className="text-base font-display font-semibold text-foreground">Compte suspendu</h2>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Ton accès à Agape a été suspendu par l&apos;équipe de modération
          {profile.suspended_reason ? ` : ${profile.suspended_reason}` : "."}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Si tu penses qu&apos;il s&apos;agit d&apos;une erreur, contacte le support.
        </p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
