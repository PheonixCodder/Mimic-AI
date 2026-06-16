"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Hook that provides a one-click Polar checkout redirect.
 * Calls the `billing.createCheckout` tRPC mutation and navigates
 * the user to the returned Polar-hosted checkout URL.
 */
export function useCheckout() {
  const trpc = useTRPC();
  const mutation = useMutation(trpc.billing.createCheckout.mutationOptions({}));

  const checkout = useCallback(() => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    });
  }, [mutation]);

  return {
    checkout,
    isPending: mutation.isPending,
  };
}
