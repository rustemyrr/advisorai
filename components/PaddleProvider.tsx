"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { PaddlePublicConfig } from "@/lib/paddle-public-config";
import { isPaddleCheckoutConfigured } from "@/lib/paddle-checkout";
import { unlockPagePointerEvents } from "@/lib/paddle-client";
import { useAuth } from "@/lib/auth-context";

const emptyConfig: PaddlePublicConfig = {
  clientToken: "",
  priceIdStarter: "",
  priceId: "",
  priceIdProfessional: "",
  environment: "sandbox",
};

type PaddleContextValue = {
  openProCheckout: (priceIdOverride?: string) => Promise<void>;
  checkoutLoading: boolean;
  config: PaddlePublicConfig;
  configLoaded: boolean;
};

const PaddleContext = createContext<PaddleContextValue | null>(null);

type PaddleProviderProps = {
  children: React.ReactNode;
  config: PaddlePublicConfig;
};

async function fetchPaddleConfig(): Promise<PaddlePublicConfig> {
  const res = await fetch("/api/paddle/config", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load Paddle config (${res.status})`);
  }
  return res.json() as Promise<PaddlePublicConfig>;
}

function mergeConfig(
  initial: PaddlePublicConfig,
  fresh: PaddlePublicConfig
): PaddlePublicConfig {
  return {
    clientToken: fresh.clientToken || initial.clientToken,
    priceIdStarter: fresh.priceIdStarter || initial.priceIdStarter,
    priceId: fresh.priceId || initial.priceId,
    priceIdProfessional: fresh.priceIdProfessional || initial.priceIdProfessional,
    environment: fresh.environment || initial.environment,
  };
}

export function PaddleProvider({ children, config: initialConfig }: PaddleProviderProps) {
  const { user, openAuthModal } = useAuth();
  const [config, setConfig] = useState(initialConfig);
  const [configLoaded, setConfigLoaded] = useState(
    isPaddleCheckoutConfigured(initialConfig)
  );
  const paddleRef = useRef<Paddle | undefined>(undefined);
  const initPromiseRef = useRef<Promise<Paddle | undefined> | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    unlockPagePointerEvents();

    let cancelled = false;

    fetchPaddleConfig()
      .then((fresh) => {
        if (cancelled) return;
        const merged = mergeConfig(initialConfig, fresh);
        setConfig(merged);
        setConfigLoaded(isPaddleCheckoutConfigured(merged));
      })
      .catch((err) => {
        console.error("[paddle] config fetch failed:", err);
        if (!cancelled) {
          setConfigLoaded(isPaddleCheckoutConfigured(initialConfig));
        }
      });

    return () => {
      cancelled = true;
      unlockPagePointerEvents();
    };
  }, [initialConfig]);

  const ensurePaddle = useCallback(async (): Promise<Paddle | undefined> => {
    if (paddleRef.current) return paddleRef.current;
    if (initPromiseRef.current) return initPromiseRef.current;

    let activeConfig = config;

    if (!isPaddleCheckoutConfigured(activeConfig)) {
      try {
        activeConfig = mergeConfig(activeConfig, await fetchPaddleConfig());
        setConfig(activeConfig);
        setConfigLoaded(isPaddleCheckoutConfigured(activeConfig));
      } catch {
        return undefined;
      }
    }

    if (!activeConfig.clientToken) return undefined;

    const promise = initializePaddle({
      environment: activeConfig.environment,
      token: activeConfig.clientToken,
      eventCallback: (event) => {
        if (
          event.name === "checkout.closed" ||
          event.name === "checkout.error" ||
          event.name === "checkout.completed"
        ) {
          unlockPagePointerEvents();
        }
      },
    })
      .then((instance) => {
        if (instance) {
          paddleRef.current = instance;
          try {
            instance.Checkout.close();
          } catch {
            /* no open checkout */
          }
          unlockPagePointerEvents();
        }
        return instance;
      })
      .catch((err) => {
        console.error("[paddle] initialize failed:", err);
        unlockPagePointerEvents();
        return undefined;
      })
      .finally(() => {
        initPromiseRef.current = null;
      });

    initPromiseRef.current = promise;
    return promise;
  }, [config]);

  const openProCheckout = useCallback(async (priceIdOverride?: string) => {
    unlockPagePointerEvents();

    if (!user) {
      openAuthModal();
      return;
    }

    let activeConfig = config;

    if (!isPaddleCheckoutConfigured(activeConfig)) {
      try {
        activeConfig = mergeConfig(activeConfig, await fetchPaddleConfig());
        setConfig(activeConfig);
        setConfigLoaded(isPaddleCheckoutConfigured(activeConfig));
      } catch {
        /* fall through to alert */
      }
    }

    if (!isPaddleCheckoutConfigured(activeConfig)) {
      window.alert(
        "Checkout is not configured. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and NEXT_PUBLIC_PADDLE_PRICE_ID in .env.local (no empty values), then restart the dev server."
      );
      return;
    }

    setCheckoutLoading(true);

    try {
      const instance = await ensurePaddle();
      if (!instance) {
        window.alert(
          "Could not load Paddle checkout. Confirm your client token matches your price (live token with live price, or sandbox with sandbox)."
        );
        return;
      }

      instance.Checkout.open({
        items: [{ priceId: priceIdOverride ?? activeConfig.priceId, quantity: 1 }],
        customData: { user_id: user.id },
        customer: user.email ? { email: user.email } : undefined,
      });
    } finally {
      setCheckoutLoading(false);
      unlockPagePointerEvents();
    }
  }, [config, ensurePaddle, user, openAuthModal]);

  const value = useMemo(
    () => ({ openProCheckout, checkoutLoading, config, configLoaded }),
    [openProCheckout, checkoutLoading, config, configLoaded]
  );

  return (
    <PaddleContext.Provider value={value}>{children}</PaddleContext.Provider>
  );
}

export function usePaddle() {
  const context = useContext(PaddleContext);
  if (!context) {
    throw new Error("usePaddle must be used within PaddleProvider");
  }
  return context;
}
