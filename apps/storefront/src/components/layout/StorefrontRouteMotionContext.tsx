"use client";

import { createContext, useContext, useLayoutEffect } from "react";

interface StorefrontRouteMotionContextValue {
  revealEpoch: number;
  markRoutePending: (pathname: string) => void;
  markRouteReady: (pathname: string) => void;
}

const StorefrontRouteMotionContext =
  createContext<StorefrontRouteMotionContextValue>({
    revealEpoch: 0,
    markRoutePending: () => undefined,
    markRouteReady: () => undefined,
  });

export const StorefrontRouteRevealProvider =
  StorefrontRouteMotionContext.Provider;

export function useStorefrontRouteRevealEpoch() {
  return useContext(StorefrontRouteMotionContext).revealEpoch;
}

export function useStorefrontRouteReadiness(
  pathname: string,
  isReady: boolean,
) {
  const { markRoutePending, markRouteReady } = useContext(
    StorefrontRouteMotionContext,
  );

  useLayoutEffect(() => {
    if (isReady) {
      markRouteReady(pathname);
      return;
    }

    markRoutePending(pathname);
  }, [isReady, markRoutePending, markRouteReady, pathname]);
}
