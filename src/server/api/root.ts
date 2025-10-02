import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { clientsRouter } from "~/server/api/routers/clients";
import { plansRouter } from "~/server/api/routers/plans";
import { planTemplatesRouter } from "~/server/api/routers/planTemplates";
import { progressionTypesRouter } from "~/server/api/routers/progressionTypes";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  plans: plansRouter,
  planTemplates: planTemplatesRouter,
  progressionTypes: progressionTypesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 */
export const createCaller = createCallerFactory(appRouter);
