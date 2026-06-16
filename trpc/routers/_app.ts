import { createTRPCRouter } from "../init";
import { avatarsRouter } from "./avatars";
import { brandKitsRouter } from "./brand-kits";
// import { exportsRouter } from "./exports";
// import { jobsRouter } from "./jobs";
import { healthRouter } from "./health";
import { profileRouter } from "./profile";
import { projectsRouter } from "./projects";
import { scriptsRouter } from "./scripts";
import { templatesRouter } from "./templates";
// import { videosRouter } from "./videos";
import { voicesRouter } from "./voices";
import { workspacesRouter } from "./workspaces";
// import { webhooksRouter } from "./webhooks";
import { billingRouter } from "./billing";
// import { clipsRouter } from "./clips";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  profile: profileRouter,
  projects: projectsRouter,
  scripts: scriptsRouter,
  voices: voicesRouter,
  avatars: avatarsRouter,
  // videos: videosRouter,
  // clips: clipsRouter,
  workspaces: workspacesRouter,
  brandKits: brandKitsRouter,
  templates: templatesRouter,
  // exports: exportsRouter,
  // jobs: jobsRouter,
  // webhooks: webhooksRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
