import { Suspense } from "react";
import { AdminSupportInbox } from "@/components/features/admin/admin-support-inbox";

export default function AdminSupportPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight text-foreground">Dossiers de support</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Réponds à un dossier, le membre le voit en temps réel — clôture-le une fois résolu.</p>
      </div>
      <Suspense fallback={<p className="text-xs text-muted-foreground p-4">Chargement...</p>}>
        <AdminSupportInbox />
      </Suspense>
    </div>
  );
}
