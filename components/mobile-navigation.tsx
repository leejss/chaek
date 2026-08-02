"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type MobileNavigationContextValue = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const MobileNavigationContext =
  createContext<MobileNavigationContextValue | null>(null);

export function MobileNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) {
        setIsOpen(false);
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  return (
    <MobileNavigationContext.Provider
      value={{ isOpen, setIsOpen, triggerRef }}
    >
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);

  if (!context) {
    throw new Error(
      "useMobileNavigation must be used within MobileNavigationProvider.",
    );
  }

  return context;
}
