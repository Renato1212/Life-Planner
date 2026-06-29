"use client";

import { useStore } from "@/lib/store";
import { SignIn } from "./SignIn";
import { Icon } from "./Icon";

// In Supabase mode, blocks the app until the user signs in.
// In local mode this never triggers (needsAuth stays false).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, mode, needsAuth } = useStore();

  if (mode === "supabase" && ready && needsAuth) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-ios-lg bg-tint/10">
              <Icon name="Sparkles" size={36} className="text-tint" />
            </div>
            <h1 className="text-[30px] font-bold tracking-tight text-ink">
              Welcome to Quadrante
            </h1>
            <p className="mt-2 text-[15px] text-ink-3">
              Sign in to save your plan and sync it across every device.
            </p>
          </div>
          <SignIn />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
