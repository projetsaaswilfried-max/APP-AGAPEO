import { Skeleton } from "@/components/ui/skeleton";

/**
 * Écran affiché instantanément pendant le chargement d'une page de l'espace
 * membre : sans lui, un toucher dans le menu ne changeait rien à l'écran tant
 * que le serveur n'avait pas répondu (impression que l'action « traîne »).
 * Next précharge aussi cette frontière de chargement, ce qui rend le
 * changement de page immédiat.
 */
export default function DashboardLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-[10px]" />
        <Skeleton className="h-4 w-72 max-w-full rounded-[8px]" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
