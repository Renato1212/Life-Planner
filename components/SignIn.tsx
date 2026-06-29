"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button, Card, inputClass } from "./ui";
import { Icon } from "./Icon";

// Email + password sign-in (with an optional create-account mode). On success
// the auth state listener in the store hydrates the app. Google stays as a
// secondary option for those who also want Calendar sync.
export function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: addr,
        password,
      });
      setLoading(false);
      if (error) setError(error.message);
      // success → onAuthStateChange in the store closes the gate.
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: addr,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) setError(error.message);
      else if (data.session) {
        /* confirmation disabled → signed in immediately */
      } else {
        setInfo(
          "Account created. Check your email to confirm it, then sign in.",
        );
        setMode("signin");
      }
    }
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
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-3">
          Password
        </span>
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className={inputClass}
          value={password}
          placeholder="••••••••"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </label>

      <Button className="mt-4 w-full" onClick={submit} disabled={loading}>
        {loading
          ? "…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
        className="mt-3 w-full text-center text-[13px] font-semibold text-tint"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Have an account? Sign in"}
      </button>

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

      {info && (
        <p className="mt-3 text-[13px] font-medium text-tint">{info}</p>
      )}
      {error && (
        <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>
      )}
    </Card>
  );
}
