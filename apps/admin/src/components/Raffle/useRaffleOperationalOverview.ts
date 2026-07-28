import React from "react";
import { apiRaffleParticipations } from "../../api";
import type { RaffleOperationalOverview } from "../../types";

export const useRaffleOperationalOverview = (
  raffleId: string | number,
  showToast: (message: string, type?: "success" | "error") => void,
) => {
  const [overview, setOverview] =
    React.useState<RaffleOperationalOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const requestSequence = React.useRef(0);

  const refresh = React.useCallback(
    async (silent = false) => {
      const sequence = ++requestSequence.current;
      if (!silent) setIsLoading(true);

      try {
        const nextOverview =
          await apiRaffleParticipations.getRaffleOverview(raffleId);
        if (sequence === requestSequence.current) {
          setOverview(nextOverview);
        }
      } catch {
        if (!silent) {
          showToast("No se pudo cargar el resumen de la rifa.", "error");
        }
      } finally {
        if (!silent && sequence === requestSequence.current) {
          setIsLoading(false);
        }
      }
    },
    [raffleId, showToast],
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refresh(true);
      }, 96);
    };
    const eventSource = new EventSource(
      apiRaffleParticipations.getAvailabilityEventsUrl(),
    );
    const handleAvailabilityChanged = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { raffleId?: number };
        if (Number(payload.raffleId) === Number(raffleId)) {
          scheduleRefresh();
        }
      } catch {
        // A later valid event or focus reconciliation will refresh the view.
      }
    };
    const handleFocus = () => scheduleRefresh();

    eventSource.addEventListener(
      "availability-changed",
      handleAvailabilityChanged as EventListener,
    );
    window.addEventListener("focus", handleFocus);

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      eventSource.removeEventListener(
        "availability-changed",
        handleAvailabilityChanged as EventListener,
      );
      eventSource.close();
      window.removeEventListener("focus", handleFocus);
    };
  }, [raffleId, refresh]);

  return { overview, isLoading, refresh };
};
