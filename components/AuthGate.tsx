"use client";

import { useStore } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button, Card } from "./ui";
import { Icon } from "./Icon";

// In Supabase mode, blocks the app until the user signs in with Google.
// In local mode this never triggers (needsAuth stays false).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, mode, needsAuth } = useStore();

  if (mode === "supabase" && ready && needsAuth) {
    const signIn = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
    };
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-ios-lg bg-tint/10">
            <Icon name="Sparkles" size={36} className="text-tint" />
          </div>
          <h1 className="text-[30px] font-bold tracking-tight text-ink">
            Welcome to Quadrante
          </h1>
          <p className="mt-2 text-[15px] text-ink-3">
            Sign in to sync your life across devices and Google Calendar.
          </p>
          <Card className="mt-8 p-6">
            <Button className="w-full" onClick={signIn}>
              <Icon name="Users" size={18} /> Continue with Google
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
