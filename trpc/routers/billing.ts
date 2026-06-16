import "server-only";

import { TRPCError } from "@trpc/server";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { insforgeAdmin } from "@/lib/insforge/admin";
import { createTRPCRouter, workspaceProcedure } from "../init";

/**
 * Ensures the workspace has a Polar customer, creating one on-the-fly if
 * it is missing, and returns the current CustomerState.
 */
async function resolveCustomerState(
  workspaceId: string,
  workspaceName: string,
  userEmail: string,
) {
  // First, try fetching state by external ID (workspace ID)
  try {
    const state = await polar.customers.getStateExternal({
      externalId: workspaceId,
    });
    return state;
  } catch {
    // Customer doesn't exist yet — create it
    const customer = await polar.customers.create({
      externalId: workspaceId,
      email: userEmail,
      name: workspaceName,
    });

    // Persist the Polar customer ID back to the workspace row
    await insforgeAdmin.database
      .from("workspaces")
      .update({ polar_external_id: customer.id })
      .eq("id", workspaceId);

    // Now fetch the fresh state
    const state = await polar.customers.getStateExternal({
      externalId: workspaceId,
    });
    return state;
  }
}

export const billingRouter = createTRPCRouter({
  /**
   * Returns the workspace's subscription status and estimated usage cost.
   */
  getStatus: workspaceProcedure.query(async ({ ctx }) => {
    try {
      const customerState = await resolveCustomerState(
        ctx.workspace.id,
        ctx.workspace.name,
        ctx.user.email ?? `workspace-${ctx.workspace.id}@mimic.ai`,
      );

      const hasActiveSubscription =
        (customerState.activeSubscriptions ?? []).length > 0;

      // Sum estimated costs from all active subscriptions
      let estimatedCostCents = 0;
      for (const sub of customerState.activeSubscriptions ?? []) {
        for (const meter of (sub as any).meters ?? []) {
          estimatedCostCents += meter.amount ?? 0;
        }
      }

      // Fetch meters to map meter IDs to their configured name
      const meterMap: Record<string, string> = {};
      try {
        const metersList = await polar.meters.list({ limit: 100 });
        const items = metersList?.result?.items ?? [];
        for (const meter of items) {
          if (meter?.id && meter?.name) {
            meterMap[meter.id] = meter.name;
          }
        }
      } catch (err) {
        console.error("Failed to list meters from Polar:", err);
      }

      // Enrich customerState subscriptions with the human-readable meter names
      const activeSubscriptions = (customerState.activeSubscriptions ?? []).map((sub) => {
        const meters = ((sub as any).meters ?? []).map((meter: any) => ({
          ...meter,
          name: meterMap[meter.meterId] ?? null,
        }));
        return {
          ...sub,
          meters,
        };
      });

      return {
        hasActiveSubscription,
        customerId: customerState.id,
        estimatedCostCents,
        activeSubscriptions,
        grantedBenefits: (customerState as any).grantedBenefits ?? [],
      };
    } catch {
      // Polar is unconfigured or offline — graceful fallback
      return {
        hasActiveSubscription: false,
        customerId: null,
        estimatedCostCents: 0,
        activeSubscriptions: [],
        grantedBenefits: [],
      };
    }
  }),

  /**
   * Creates a Polar checkout session and returns the URL.
   */
  createCheckout: workspaceProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await polar.checkouts.create({
        products: [env.POLAR_PRODUCT_ID],
        externalCustomerId: ctx.workspace.id,
        successUrl: `${env.APP_URL}/dashboard/settings?billing=success`,
      });

      if (!result.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Polar checkout did not return a URL",
        });
      }

      return { checkoutUrl: result.url };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Polar checkout session",
      });
    }
  }),

  /**
   * Creates a Polar customer portal session for managing subscriptions.
   */
  createPortalSession: workspaceProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await polar.customerSessions.create({
        externalCustomerId: ctx.workspace.id,
      });

      if (!result.customerPortalUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Polar portal session did not return a URL",
        });
      }

      return { portalUrl: result.customerPortalUrl };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Polar customer portal session",
      });
    }
  }),
});
