"use client";

import { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ServiceWorkerRegister } from "./service-worker-register";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ServiceWorkerRegister />
      {children}
    </QueryProvider>
  );
}
