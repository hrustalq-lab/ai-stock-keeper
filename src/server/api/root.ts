import { postRouter } from "~/server/api/routers/post";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { intakeRouter } from "~/server/api/routers/intake";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { alertsRouter } from "~/server/api/routers/alerts";
import { forecastRouter } from "~/server/api/routers/forecast";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  inventory: inventoryRouter,
  intake: intakeRouter,
  dashboard: dashboardRouter,
  alerts: alertsRouter,
  forecast: forecastRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
