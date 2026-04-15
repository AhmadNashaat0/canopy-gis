import { Worker, Queue } from "bullmq";
import { connection } from "../redis";
import { runBasisSurfaceLayerPipeline } from "./index";

const queueName = "basis-layer-queue";

export const basisLayerQueue = new Queue(queueName, { connection });

export const basisLayerWorker = new Worker(
  queueName,
  async (job) => {
    console.log(`Job ${job.name} started`);
    if (job.name === "run") {
      await runBasisSurfaceLayerPipeline();
    }
  },
  { connection },
);

basisLayerWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

basisLayerWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
