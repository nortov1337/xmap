import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";

export function useToast() {
  const toast = useApp((s) => s.toast);
  const showToast = useApp((s) => s.showToast);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback(
    (message: string) => {
      showToast(message);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => showToast(null), 2200);
    },
    [showToast],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, notify };
}
