"use client";

import { useEffect } from "react";
import { usePaddle } from "./PaddleProvider";
import { unlockPagePointerEvents } from "@/lib/paddle-client";

type ProCheckoutButtonProps = {
  label: string;
  priceId?: string;
  className?: string;
};

export default function ProCheckoutButton({
  label,
  priceId,
  className = "",
}: ProCheckoutButtonProps) {
  const { openProCheckout, checkoutLoading } = usePaddle();
  // Without a price id of its own a button would fall back to the Standard
  // price inside openProCheckout, charging the wrong plan. Disable instead.
  const disabled = !priceId;

  useEffect(() => {
    unlockPagePointerEvents();
  }, []);

  return (
    <div className="relative z-30 mt-8 shrink-0 [pointer-events:auto]">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void openProCheckout(priceId);
        }}
        className={`w-full rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white [pointer-events:auto] ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-gray-800"
        } ${className}`}
      >
        {disabled ? "Unavailable" : checkoutLoading ? "Opening checkout…" : label}
      </button>
    </div>
  );
}
