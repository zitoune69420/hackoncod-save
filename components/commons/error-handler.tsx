"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/commons/toasts";
import {
  DEFAULT_LOCALE,
  getMessage,
  getStoredLanguage,
  loadMessages,
  type Locale,
} from "@/lib/i18n";

function toastMessage(key: string) {
  const locale: Locale =
    typeof window !== "undefined" ? getStoredLanguage() : DEFAULT_LOCALE;
  showToast({
    text: getMessage(loadMessages(locale), key),
    variant: "error",
    force: true,
    muteSound: true,
  });
}

let lastRuntimeToastAt = 0;
const RUNTIME_THROTTLE_MS = 4000;

function toastRuntimeThrottled() {
  const now = Date.now();
  if (now - lastRuntimeToastAt < RUNTIME_THROTTLE_MS) return;
  lastRuntimeToastAt = now;
  toastMessage("common.errorHandler.runtime");
}

type BoundaryProps = {
  children: React.ReactNode;
};

type BoundaryState = {
  error: Error | null;
  resetKey: number;
};

/**
 * Boundary React : toast d’erreur + sous-arbre replacé par un bandeau « Réessayer »
 * (la navigation et le reste du layout hors boundary restent utilisables).
 */
class ErrorHandlerBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorHandler]", error.message, info.componentStack);
    toastMessage("common.errorHandler.render");
  }

  private handleRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      const locale: Locale =
        typeof window !== "undefined" ? getStoredLanguage() : DEFAULT_LOCALE;
      const retryLabel = getMessage(
        loadMessages(locale),
        "common.errorHandler.retry",
      );
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground"
        >
          <Button type="button" variant="outline" size="sm" onClick={this.handleRetry}>
            {retryLabel}
          </Button>
        </div>
      );
    }

    return (
      <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
    );
  }
}

/**
 * Erreurs JS globales (hors React) : toast throttlé. À monter une seule fois (ex. layout racine).
 */
export function RuntimeErrorListeners() {
  React.useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (event.defaultPrevented) return;
      if (event.error instanceof Error) {
        toastRuntimeThrottled();
      }
    };

    const onUnhandledRejection = () => {
      toastRuntimeThrottled();
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

type ErrorHandlerProps = {
  children: React.ReactNode;
};

/**
 * Boundary React : toast + zone limitée (ex. contenu dashboard). Ne pas entourer la sidebar ni le layout racine.
 */
export function ErrorHandler({ children }: ErrorHandlerProps) {
  return <ErrorHandlerBoundary>{children}</ErrorHandlerBoundary>;
}
