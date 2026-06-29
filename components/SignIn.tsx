"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button, Card, inputClass } from "./ui";
import { Icon } from "./Icon";

// Passwordless email sign-in (magic link) + optional Google. Works on any
// device/browser: enter your email, click the link we send, and your data
// follows you everywhere.
export function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLink = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) setError(error.message);
  };

  if (sent) {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-tint/10 text-tint">
          <Icon name="Check" size={26} strokeWidth={2.5} />
        </div>
        <p className="text-[17px] font-bold text-ink">Check your email</p>
        <p className="mt-1 text-[14px] text-ink-3">
          We sent a sign-in link to <span className="font-semibold">{email}</span>.
          Open it on this device to finish — your data will sync here and
          everywhere.
        </p>
        <button
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="mt-4 text-[14px] font-semibold text-tint"
        >
          Use a different email
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <label className="block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-3">
          Email
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendLink();
          }}
        />
      </label>
      <Button className="mt-3 w-full" onClick={sendLink} disabled={loading}>
        <Icon name="Check" size={18} />
        {loading ? "Sending…" : "Email me a sign-in link"}
      </Button>

      <div className="my-4 flex items-center gap-3 text-[12px] text-ink-3">
        <span className="h-px flex-1 bg-border" /> or{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" className="w-full" onClick={google}>
        <Icon name="Users" size={18} /> Continue with Google
      </Button>
      <p className="mt-2 px-1 text-[12px] text-ink-3">
        Google also enables two-way Calendar sync (needs Google setup).
      </p>

      {error && (
        <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>
      )}
    </Card>
  );
}
