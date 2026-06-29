"use client";

import { useEffect } from "react";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Visible in the browser console so the loaded build is verifiable.
    console.log(`%cQuadrante · ${APP_VERSION}`, "color:#5a5ac8;font-weight:600");
  }, []);
  return (
    <StoreProvider>
      <ToastProvider>{children}</ToastProvider>
    </StoreProvider>
  );
}
