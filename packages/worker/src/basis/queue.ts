import { Worker, Queue } from "bullmq";
import { runBasisGridPipeline } from "./index";
import { connection } from "../redis";

const queueName = "basis-grid-queue";

export const basisGridQueue = new Queue(queueName, { connection });

export async function setupBasisJobs() {
  await basisGridQueue.add(
    "daily-run",
    {},
    {
      repeat: {
        pattern: "0 1 * * *", // Daily at 1 AM
      },
    },
  );
  console.log("Job scheduled: daily at 1 AM");
}

export const basisWorker = new Worker(
  queueName,
  async (job) => {
    console.log(`Job ${job.name} started`);
    if (job.name === "daily-run") {
      await runBasisGridPipeline();
    }
  },
  { connection },
);

basisWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

basisWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
