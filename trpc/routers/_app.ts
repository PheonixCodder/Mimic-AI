import { createTRPCRouter } from "../init";
import { adminRouter } from "./admin";
import { apiKeysRouter } from "./api-keys";
import { auditLogsRouter } from "./audit-logs";
import { avatarsRouter } from "./avatars";
import { brandKitsRouter } from "./brand-kits";
import { clipsRouter } from "./clips";
import { digitalTwinsRouter } from "./digital-twins";
import { estimateRouter } from "./estimate";
import { experimentsRouter } from "./experiments";
import { exportsRouter } from "./exports";
import { healthRouter } from "./health";
import { jobsRouter } from "./jobs";
import { modelVariantsRouter } from "./model-variants";
import { profileRouter } from "./profile";
import { projectsRouter } from "./projects";
import { scriptsRouter } from "./scripts";
import { templatesRouter } from "./templates";
import { videosRouter } from "./videos";
import { voicesRouter } from "./voices";
import { webhooksRouter } from "./webhooks";
import { workspacesRouter } from "./workspaces";
import { billingRouter } from "./billing";
import { agentRouter } from "./agent";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  profile: profileRouter,
  admin: adminRouter,
  apiKeys: apiKeysRouter,
  auditLogs: auditLogsRouter,
  projects: projectsRouter,
  scripts: scriptsRouter,
  voices: voicesRouter,
  avatars: avatarsRouter,
  videos: videosRouter,
  clips: clipsRouter,
  digitalTwins: digitalTwinsRouter,
  estimate: estimateRouter,
  experiments: experimentsRouter,
  workspaces: workspacesRouter,
  brandKits: brandKitsRouter,
  templates: templatesRouter,
  exports: exportsRouter,
  jobs: jobsRouter,
  modelVariants: modelVariantsRouter,
  webhooks: webhooksRouter,
  billing: billingRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
