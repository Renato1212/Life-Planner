"use client";

import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { SignIn } from "@/components/SignIn";
import { Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-ios-lg bg-tint/10">
          <Icon name="Sparkles" size={36} className="text-tint" />
        </div>
        <h1 className="text-[32px] font-bold tracking-tight text-ink">Quadrante</h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Plan, track, and improve across your three life areas.
        </p>

        <div className="mt-8 text-left">
          {SUPABASE_ENABLED ? (
            <SignIn />
          ) : (
            <Card className="p-6 text-center">
              <p className="text-[14px] text-ink-3">
                Backend not configured yet. The app is running in local mode —
                just open the{" "}
                <a href="/" className="font-semibold text-tint">
                  home screen
                </a>
                . Add the Supabase env vars to enable email sign-in &amp; sync.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
