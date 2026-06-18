import "server-only";

import { polar } from "@/lib/polar";
import { insforgeAdmin } from "@/lib/insforge/admin";

async function resolveCustomerState(
  workspaceId: string,
  workspaceName: string,
  userEmail: string,
) {
  try {
    return await polar.customers.getStateExternal({
      externalId: workspaceId,
    });
  } catch {
    const customer = await polar.customers.create({
      externalId: workspaceId,
      email: userEmail,
      name: workspaceName,
    });

    await insforgeAdmin.database
      .from("workspaces")
      .update({ polar_external_id: customer.id })
      .eq("id", workspaceId);

    return await polar.customers.getStateExternal({
      externalId: workspaceId,
    });
  }
}

export async function workspaceHasActiveSubscription(
  workspaceId: string,
  workspaceName: string,
  userEmail: string,
): Promise<boolean> {
  try {
    const customerState = await resolveCustomerState(
      workspaceId,
      workspaceName,
      userEmail,
    );
    return (customerState.activeSubscriptions ?? []).length > 0;
  } catch {
    return false;
  }
}
