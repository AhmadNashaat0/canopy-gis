import { Worker, Queue } from "bullmq";
import { runBasisGridPipeline } from "./index";
import { connection } from "../redis";

const queueName = "basis-grid-queue";

export const basisGridQueue = new Queue(queueName, { connection });

export async function setupBasisJobs() {
  await basisGridQueue.add(
    "create-basis-grid",
    {},
    {
      repeat: {
        pattern: "0 3 * * *",
      },
    },
  );
  console.log("Job scheduled: daily at 2 AM");
}

export const basisWorker = new Worker(
  queueName,
  async (job) => {
    console.log(`Job ${job.name} started`);
    if (job.name === "create-basis-grid") {
      await runBasisGridPipeline({
        logger: async (message: string) => {
          console.log(message);
          await job.log(message);
        },
      });
      // await basisLayerQueue.add("run", {});
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
