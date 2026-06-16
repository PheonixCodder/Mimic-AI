import { logger, task } from "@trigger.dev/sdk/v3";

export const ping = task({
  id: "ping",
  run: async (payload: { message?: string }) => {
    logger.info("mimic-ai trigger.dev connected", payload);
    return {
      ok: true,
      message: payload.message ?? "pong",
      timestamp: new Date().toISOString(),
    };
  },
});
