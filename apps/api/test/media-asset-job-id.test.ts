import assert from "node:assert/strict";
import test from "node:test";
import { Job } from "bullmq";
import { createMediaProcessingJobId } from "../src/modules/store/media-assets/media-asset.job-id";

function createJob(jobId: string) {
  const keys = Object.fromEntries(
    [
      "wait",
      "active",
      "prioritized",
      "events",
      "stalled",
      "limiter",
      "delayed",
      "paused",
      "meta",
      "pc",
    ].map((key) => [key, `bull:media-processing:${key}`]),
  );
  const queue = {
    keys,
    qualifiedName: "bull:media-processing",
    toKey: (key: string) => `bull:media-processing:${key}`,
  };
  const job = new Job(
    queue as never,
    "optimize-video",
    { assetId: "asset-id" },
    { jobId },
  );
  const scripts = (
    job as unknown as {
      scripts: { addJob: (...args: unknown[]) => Promise<string> };
    }
  ).scripts;
  scripts.addJob = async () => jobId;

  return job;
}

test("media processing job IDs are accepted by BullMQ", async () => {
  const jobId = createMediaProcessingJobId("asset-uuid", "revision123456");
  const job = createJob(jobId);

  assert.equal(await job.addJob({} as never), jobId);
});

test("BullMQ rejects the previous colon-separated media job ID", async () => {
  const job = createJob("asset-uuid:revision123456");

  assert.throws(() => job.addJob({} as never), /Custom Id cannot contain :/);
});
