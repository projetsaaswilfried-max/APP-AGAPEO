"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePushSubscriptionAction, removePushSubscriptionAction } from "@/lib/actions/push.actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    });
  }, []);

  const handleSubscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      setError("Configuration manquante, réessaie plus tard.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      const json = subscription.toJSON();
      const result = await savePushSubscriptionAction({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth }
      });
      if (result.error) throw new Error(result.error);
      setStatus("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Désactivation impossible.");
    } finally {
      setIsBusy(false);
    }
  };

  if (status === "unsupported") return null;

  return (
    <div className="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-border/40">
      <div className="flex items-start gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-foreground shrink-0 mt-0.5">
          {status === "subscribed" ? <Bell size={15} /> : <BellOff size={15} />}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-foreground">Notifications sur cet appareil</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {status === "denied"
              ? "Les notifications sont bloquées dans les réglages de ton navigateur."
              : "Reçois une alerte immédiate pour les nouveaux messages, même l'app fermée."}
          </p>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
      </div>

      {status === "subscribed" ? (
        <Button variant="outline" size="sm" onClick={handleUnsubscribe} isLoading={isBusy}>
          Désactiver
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={handleSubscribe} isLoading={isBusy} disabled={status === "denied" || status === "checking"}>
          Activer
        </Button>
      )}
    </div>
  );
}
