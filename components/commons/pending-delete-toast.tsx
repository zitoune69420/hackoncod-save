"use client";

/**
 * Confirmation suppression admin : API Sonner comme sur
 * https://ui.shadcn.com/docs/components/radix/sonner
 * — `toast.loading` (durée infinie + bouton Annuler natif), puis `toast.promise`.
 */
import { toast } from "sonner";

const DEFAULT_SECONDS = 5;

export type PendingDeleteToastOptions = {
  getLine: (secondsLeft: number) => string;
  cancelLabel: string;
  runDelete: () => Promise<void>;
  applyingLabel: string;
  successMessage: string;
  errorFallback: string;
  seconds?: number;
};

export function showPendingDeleteConfirmToast(
  opts: PendingDeleteToastOptions,
): void {
  const total = opts.seconds ?? DEFAULT_SECONDS;
  const id = `admin-pending-delete-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let left = total;
  let cancelled = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const armCancel = {
    label: opts.cancelLabel,
    onClick: () => {
      cancelled = true;
      stop();
      toast.dismiss(id);
    },
  };

  const pushLoading = () => {
    toast.loading(opts.getLine(left), {
      id,
      duration: Infinity,
      cancel: armCancel,
    });
  };

  pushLoading();

  intervalId = setInterval(() => {
    if (cancelled) {
      stop();
      return;
    }
    left -= 1;
    if (left <= 0) {
      stop();
      toast.dismiss(id);
      void toast.promise(opts.runDelete(), {
        loading: opts.applyingLabel,
        success: opts.successMessage,
        error: (e) => (e instanceof Error ? e.message : opts.errorFallback),
      });
      return;
    }
    pushLoading();
  }, 1000);
}
