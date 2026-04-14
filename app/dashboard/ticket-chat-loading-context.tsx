"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TicketChatLoadingContextValue = {
  /** Ticket en cours d’ouverture (fetch messages + image). */
  loadingOrderId: string | null;
  setTicketChatLoading: (orderId: string | null) => void;
};

const TicketChatLoadingContext =
  createContext<TicketChatLoadingContextValue | null>(null);

const noopSetTicketChatLoading: TicketChatLoadingContextValue["setTicketChatLoading"] =
  () => {
    /* hors provider dashboard */
  };

export function TicketChatLoadingProvider({ children }: { children: ReactNode }) {
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const setTicketChatLoading = useCallback((orderId: string | null) => {
    setLoadingOrderId(orderId);
  }, []);
  const value = useMemo(
    () => ({ loadingOrderId, setTicketChatLoading }),
    [loadingOrderId, setTicketChatLoading],
  );
  return (
    <TicketChatLoadingContext.Provider value={value}>
      {children}
    </TicketChatLoadingContext.Provider>
  );
}

export function useTicketChatLoading(): TicketChatLoadingContextValue {
  const ctx = useContext(TicketChatLoadingContext);
  if (!ctx) {
    return {
      loadingOrderId: null,
      setTicketChatLoading: noopSetTicketChatLoading,
    };
  }
  return ctx;
}
