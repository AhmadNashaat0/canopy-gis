import { Worker, Queue } from "bullmq";
import { connection } from "../redis";
import { runSfToGisLoader } from "./index";

const queueName = "sf-to-db-sync-queue";

export const sfToDbSyncQueue = new Queue(queueName, { connection });

export async function setupSfToDbSyncJobs() {
  await sfToDbSyncQueue.add(
    "sync-from-sf-to-db",
    {},
    {
      repeat: {
        pattern: "0 0 * * *",
      },
    },
  );
  console.log("Job scheduled: daily at 1 AM");
}

export const sfToDbSyncWorker = new Worker(
  queueName,
  async (job) => {
    console.log(`Job ${job.name} started`);
    if (job.name === "sync-from-sf-to-db") {
      await runSfToGisLoader({
        logger: async (message: string) => {
          console.log(message);
          await job.log(message);
        },
      });
    }
  },
  { connection },
);

sfToDbSyncWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

sfToDbSyncWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
