"use client";

import { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ServiceWorkerRegister } from "./service-worker-register";
import { PwaInstallProvider } from "./pwa-install-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <PwaInstallProvider>
        <ServiceWorkerRegister />
        {children}
      </PwaInstallProvider>
    </QueryProvider>
  );
}
