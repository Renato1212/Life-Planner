"use client";

import { ThemeToggle } from "./ThemeToggle";

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="pt-3 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[13px] font-semibold uppercase tracking-wide text-tint">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-0.5 text-[34px] font-bold leading-tight tracking-tight text-ink">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 pt-2">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
