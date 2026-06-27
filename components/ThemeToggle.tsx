"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { haptic } from "@/lib/utils";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("quadrante.theme");
    const prefers =
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    haptic();
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("quadrante.theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="active-press tappable grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-ink-2"
    >
      <Icon name={dark ? "Sun" : "Moon"} size={18} />
    </button>
  );
}
