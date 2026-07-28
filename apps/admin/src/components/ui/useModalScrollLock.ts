import { useLayoutEffect } from "react";

let activeModalLocks = 0;
let appRootWasInert = false;
let lockedScrollY = 0;
let previousBodyStyles: Pick<
  CSSStyleDeclaration,
  | "position"
  | "top"
  | "left"
  | "right"
  | "width"
  | "overflow"
  | "paddingRight"
> | null = null;
let previousRootStyles: Pick<
  CSSStyleDeclaration,
  "overscrollBehavior"
> | null = null;

export const useModalScrollLock = (isOpen: boolean) => {
  useLayoutEffect(() => {
    if (!isOpen) return;

    if (activeModalLocks === 0) {
      const body = document.body;
      const root = document.documentElement;
      const appRoot = document.getElementById("root");
      const widthBeforeLock = root.clientWidth;
      lockedScrollY = window.scrollY;
      const computedPaddingRight =
        Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      previousBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };
      previousRootStyles = {
        overscrollBehavior: root.style.overscrollBehavior,
      };
      if (appRoot) {
        appRootWasInert = appRoot.inert;
        appRoot.inert = true;
      }

      root.style.overscrollBehavior = "none";
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
      body.dataset.nexusScrollLocked = "true";

      const releasedScrollbarWidth = root.clientWidth - widthBeforeLock;
      if (
        window.matchMedia("(min-width: 768px)").matches &&
        releasedScrollbarWidth > 0
      ) {
        body.style.paddingRight = `${computedPaddingRight + releasedScrollbarWidth}px`;
      }
    }
    activeModalLocks += 1;

    return () => {
      activeModalLocks = Math.max(0, activeModalLocks - 1);
      if (
        activeModalLocks === 0 &&
        previousBodyStyles &&
        previousRootStyles
      ) {
        const body = document.body;
        const root = document.documentElement;
        const appRoot = document.getElementById("root");
        const previousScrollBehavior = root.style.scrollBehavior;

        root.style.scrollBehavior = "auto";
        Object.assign(body.style, previousBodyStyles);
        Object.assign(root.style, previousRootStyles);
        window.scrollTo({
          top: lockedScrollY,
          left: 0,
          behavior: "auto",
        });
        root.style.scrollBehavior = previousScrollBehavior;
        delete body.dataset.nexusScrollLocked;
        if (appRoot) appRoot.inert = appRootWasInert;
        previousBodyStyles = null;
        previousRootStyles = null;
      }
    };
  }, [isOpen]);
};
