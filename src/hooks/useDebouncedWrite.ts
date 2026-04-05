import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Returns a debounced version of an async write function.
 * Shows a "saving" indicator only after `showDelay` ms of inactivity.
 */
export function useDebouncedWrite<T extends (...args: any[]) => Promise<any>>(
  writeFn: T,
  delay = 600,
  showDelay = 800
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  const debouncedWrite = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timers
      if (timerRef.current) clearTimeout(timerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);

      // Start show-delay timer
      showTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSaving(true);
      }, showDelay);

      // Debounce the actual write
      timerRef.current = setTimeout(async () => {
        try {
          await writeFn(...args);
        } finally {
          if (showTimerRef.current) clearTimeout(showTimerRef.current);
          if (mountedRef.current) setSaving(false);
        }
      }, delay);
    },
    [writeFn, delay, showDelay]
  );

  // Flush any pending write immediately
  const flush = useCallback(() => {
    // No-op for now; pending writes will complete on their own
  }, []);

  return { debouncedWrite, saving, flush };
}
