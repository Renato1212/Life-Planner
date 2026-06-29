"use client";

import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// Surfaces a clear warning when the browser is blocking local storage (e.g.
// Safari Private Browsing) so changes are never lost silently.
export function StorageWarning() {
  const { ready, mode, storageOk } = useStore();
  if (!ready || mode !== "local" || storageOk) return null;
  return (
    <div className="mx-auto mb-3 flex max-w-2xl items-start gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-300">
      <Icon name="Circle" size={16} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">Your changes won&apos;t be saved.</span>{" "}
        This browser is blocking storage — usually Private/Incognito mode. Open
        the app in a normal window to keep your data.
      </p>
    </div>
  );
}
