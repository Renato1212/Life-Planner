"use client";

import React, { useEffect, useState } from "react";
import { cn, haptic } from "@/lib/utils";
import { Icon } from "./Icon";

// Card -----------------------------------------------------------------------
export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-ios bg-surface shadow-ios border border-border/60",
        onClick && "active-press tappable cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Button ---------------------------------------------------------------------
export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-tint text-white",
    secondary: "bg-surface-2 text-ink",
    ghost: "bg-transparent text-tint",
    danger: "bg-red-500 text-white",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        haptic();
        onClick?.();
      }}
      className={cn(
        "active-press tappable inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-40",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

// Bottom Sheet ---------------------------------------------------------------
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open && !mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center",
        !open && "pointer-events-none",
      )}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "relative w-full sm:max-w-md bg-surface rounded-t-ios-lg sm:rounded-ios-lg shadow-sheet pb-safe",
          "max-h-[90dvh] overflow-y-auto no-scrollbar",
          open ? "animate-sheet-up" : "translate-y-full",
        )}
      >
        <div className="sticky top-0 glass z-10 flex items-center justify-between px-5 pt-3 pb-3 border-b border-border/60">
          <div className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-ink-3/40 sm:hidden" />
          <div className="text-[17px] font-semibold pt-1">{title}</div>
          <button
            onClick={onClose}
            className="active-press tappable grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink-3"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Segmented control ----------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            haptic();
            onChange(o.value);
          }}
          className={cn(
            "tappable flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-200",
            value === o.value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-3",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Field ----------------------------------------------------------------------
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl bg-surface-2 px-4 py-3 text-[16px] text-ink placeholder:text-ink-3 outline-none ring-tint/40 focus:ring-2";

// Progress bar ---------------------------------------------------------------
export function ProgressBar({
  value,
  color = "rgb(var(--tint))",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

// Progress ring --------------------------------------------------------------
export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = "rgb(var(--tint))",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

// Toast ----------------------------------------------------------------------
type ToastCtx = { show: (msg: string) => void };
const ToastContext = React.createContext<ToastCtx>({ show: () => {} });
export const useToast = () => React.useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    haptic(10);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setMsg(null), 2200);
  };
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
        {msg && (
          <div className="animate-scale-in rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-bg shadow-ios-lg">
            {msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
