"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError("Sign-in failed. Please try again.");
  }, []);

  const signIn = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setLoading(true);
    // Request Calendar scope at sign-in so the same login unlocks sync.
    // offline + consent ensure Google returns a refresh token.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-ios-lg bg-tint/10">
          <Icon name="Sparkles" size={36} className="text-tint" />
        </div>
        <h1 className="text-[32px] font-bold tracking-tight text-ink">Quadrante</h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Plan, track, and improve across your four life areas.
        </p>

        <Card className="mt-8 p-6">
          {SUPABASE_ENABLED ? (
            <>
              <Button className="w-full" onClick={signIn} disabled={loading}>
                <Icon name="Users" size={18} />
                {loading ? "Redirecting…" : "Continue with Google"}
              </Button>
              <p className="mt-3 text-[12px] text-ink-3">
                Grants calendar access so your scheduled tasks sync both ways.
              </p>
            </>
          ) : (
            <p className="text-[14px] text-ink-3">
              Backend not configured yet. The app is running in local mode —
              just open the{" "}
              <a href="/" className="font-semibold text-tint">
                home screen
              </a>
              . Add Supabase env vars to enable Google sign-in.
            </p>
          )}
          {error && (
            <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
