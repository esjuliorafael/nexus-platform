import { useEffect } from "react";

let activeModalLocks = 0;
let bodyWasAlreadyLocked = false;

export const useModalScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalLocks === 0) {
      bodyWasAlreadyLocked = document.body.classList.contains("overflow-hidden");
      document.body.classList.add("overflow-hidden");
    }
    activeModalLocks += 1;

    return () => {
      activeModalLocks = Math.max(0, activeModalLocks - 1);
      if (activeModalLocks === 0 && !bodyWasAlreadyLocked) {
        document.body.classList.remove("overflow-hidden");
      }
    };
  }, [isOpen]);
};
