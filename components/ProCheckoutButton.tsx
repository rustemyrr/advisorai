"use client";

import { useEffect } from "react";
import { usePaddle } from "./PaddleProvider";
import { unlockPagePointerEvents } from "@/lib/paddle-client";

type ProCheckoutButtonProps = {
  label: string;
  className?: string;
};

export default function ProCheckoutButton({
  label,
  className = "",
}: ProCheckoutButtonProps) {
  const { openProCheckout, checkoutLoading } = usePaddle();

  useEffect(() => {
    unlockPagePointerEvents();
  }, []);

  return (
    <div className="relative z-30 mt-8 shrink-0 [pointer-events:auto]">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void openProCheckout();
        }}
        className={`w-full cursor-pointer rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800 [pointer-events:auto] ${className}`}
      >
        {checkoutLoading ? "Opening checkout…" : label}
      </button>
    </div>
  );
}
