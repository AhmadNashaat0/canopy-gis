import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { basisGridQueue, setupBasisJobs } from "./basis-grid/queue";
import { basisLayerQueue } from "./basis-layer/queue";

async function boot() {
  // Setup all scheduled jobs
  await setupBasisJobs();

  console.log("Workers started successfully.");

  const app = new Hono();

  const serverAdapter = new HonoAdapter(serveStatic);
  createBullBoard({
    queues: [new BullMQAdapter(basisGridQueue as any), new BullMQAdapter(basisLayerQueue as any)],
    serverAdapter: serverAdapter,
  });

  const basePath = "/admin/queues";
  serverAdapter.setBasePath(basePath);
  app.route(basePath, serverAdapter.registerPlugin());

  app.get("/", (c) => c.text("Worker is running"));

  serve(
    {
      fetch: app.fetch,
      port: 4000,
    },
    (info) => {
      console.log(`Worker Dashboard is running on http://localhost:${info.port}${basePath}`);
    },
  );
}

boot().catch((err) => {
  console.error("Fatal error during boot:", err);
  process.exit(1);
});

export { basisGridQueue };
