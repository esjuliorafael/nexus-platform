import { rafflePrisma } from "@nexus/db/raffle";
import { storePrisma } from "@nexus/db/store";
import type { Job } from "bullmq";
import { whatsappQueue, type WhatsappJobData } from "../queues/whatsapp.queue";
import { evolutionClient } from "./evolution/evolution.client";
import { getEvolutionConfigFromSettings } from "./evolution/evolution.config";

const RECOVERABLE_ERROR_MARKERS = [
  "connection closed",
  "device_removed",
  "not connected",
  "connection close",
];

let reconciliationRun: Promise<WhatsappRecoveryResult> | null = null;
const instanceRecoveryRuns = new Map<string, Promise<{ recovered: number; discarded: number }>>();

export type WhatsappRecoveryResult = {
  instancesChecked: number;
  instancesOpen: number;
  recovered: number;
  discarded: number;
};

function isRecoverableConnectionError(message: string | null | undefined) {
  const normalized = String(message || "").toLowerCase();
  return RECOVERABLE_ERROR_MARKERS.some((marker) => normalized.includes(marker));
}

async function isJobStillRelevant(data: WhatsappJobData) {
  if (
    data.kind === "order" ||
    data.kind === "order-cancelled" ||
    data.kind === "order-paid" ||
    data.kind === "order-restored" ||
    data.kind === "order-reminder"
  ) {
    const order = await storePrisma.order.findUnique({
      where: { id: Number(data.orderId) },
      select: { status: true, paymentStatus: true, mpRefundedAt: true },
    });
    if (!order) return false;

    if (data.kind === "order-cancelled") return order.status === "CANCELLED";
    if (data.kind === "order-paid") {
      return order.status !== "CANCELLED" && order.paymentStatus === "APPROVED" && !order.mpRefundedAt;
    }
    return order.status === "PENDING";
  }

  if (
    data.kind === "reservation" ||
    data.kind === "reservation-cancelled" ||
    data.kind === "reservation-paid" ||
    data.kind === "reservation-reminder"
  ) {
    const sales = await rafflePrisma.ticketSale.findMany({
      where: { id: { in: data.ticketSaleIds } },
      select: { paymentStatus: true, mpRefundedAt: true },
    });
    if (sales.length !== data.ticketSaleIds.length) return false;

    if (data.kind === "reservation-cancelled") {
      return sales.every((sale) => sale.paymentStatus === "CANCELLED");
    }
    if (data.kind === "reservation-paid") {
      return sales.every((sale) => sale.paymentStatus === "PAID" && !sale.mpRefundedAt);
    }
    return sales.every((sale) => sale.paymentStatus === "PENDING");
  }

  const subscription = await rafflePrisma.raffleOpeningSubscription.findUnique({
    where: { id: data.subscriptionId },
    select: { status: true },
  });
  return Boolean(subscription && ["PENDING", "PROCESSING", "FAILED"].includes(subscription.status));
}

async function recoverJob(job: Job<WhatsappJobData>) {
  if (!(await isJobStillRelevant(job.data))) {
    await job.remove();
    return "discarded" as const;
  }

  await job.retry("failed");
  return "recovered" as const;
}

async function runFailedWhatsappJobsRecovery(instanceName: string) {
  const failedLogs = await storePrisma.whatsappMessageLog.findMany({
    where: {
      instanceName,
      status: "failed",
      jobId: { not: null },
    },
    orderBy: { sentAt: "desc" },
    take: 5000,
  });

  const latestRecoverableByJob = new Map<string, (typeof failedLogs)[number]>();
  const inspectedJobIds = new Set<string>();
  for (const log of failedLogs) {
    if (!log.jobId || inspectedJobIds.has(log.jobId)) continue;
    inspectedJobIds.add(log.jobId);
    if (isRecoverableConnectionError(log.errorMessage)) {
      latestRecoverableByJob.set(log.jobId, log);
    }
  }

  const jobIds = Array.from(latestRecoverableByJob.keys());
  if (jobIds.length === 0) return { recovered: 0, discarded: 0 };

  const successfulLogs = await storePrisma.whatsappMessageLog.findMany({
    where: {
      jobId: { in: jobIds },
      status: { in: ["sent", "server_ack", "delivered", "read"] },
    },
    select: { jobId: true },
  });
  const completedJobIds = new Set(successfulLogs.map((log) => log.jobId).filter(Boolean));

  let recovered = 0;
  let discarded = 0;
  for (const jobId of jobIds) {
    if (completedJobIds.has(jobId)) continue;
    const job = await whatsappQueue.getJob(jobId);
    if (!job || (await job.getState()) !== "failed") continue;

    const result = await recoverJob(job);
    if (result === "recovered") recovered += 1;
    else discarded += 1;
  }

  return { recovered, discarded };
}

export function recoverFailedWhatsappJobsForInstance(instanceName: string) {
  const activeRun = instanceRecoveryRuns.get(instanceName);
  if (activeRun) return activeRun;

  const run = runFailedWhatsappJobsRecovery(instanceName).finally(() => {
    instanceRecoveryRuns.delete(instanceName);
  });
  instanceRecoveryRuns.set(instanceName, run);
  return run;
}

async function runWhatsappRecoveryReconciliation(): Promise<WhatsappRecoveryResult> {
  const failedLogs = await storePrisma.whatsappMessageLog.findMany({
    where: {
      status: "failed",
      jobId: { not: null },
    },
    orderBy: { sentAt: "desc" },
    select: { instanceName: true, errorMessage: true },
    take: 5000,
  });
  const instanceNames = Array.from(new Set(
    failedLogs
      .filter((log) => isRecoverableConnectionError(log.errorMessage))
      .map((log) => log.instanceName)
      .filter((name) => name && name !== "missing"),
  ));

  if (instanceNames.length === 0) {
    return { instancesChecked: 0, instancesOpen: 0, recovered: 0, discarded: 0 };
  }

  const [globalConfig, channels] = await Promise.all([
    getEvolutionConfigFromSettings(),
    storePrisma.whatsappChannel.findMany({
      where: { active: true, instanceName: { in: instanceNames } },
      select: { instanceName: true, evolutionUrl: true, evolutionKey: true },
    }),
  ]);

  let instancesOpen = 0;
  let recovered = 0;
  let discarded = 0;

  for (const instanceName of instanceNames) {
    const channel = channels.find((item) => item.instanceName === instanceName);
    const baseUrl = channel?.evolutionUrl || globalConfig.baseUrl;
    const apiKey = channel?.evolutionKey || globalConfig.apiKey;
    if (!baseUrl || !apiKey) continue;

    try {
      const connection = await evolutionClient.getConnectionState({ instanceName, baseUrl, apiKey });
      if (connection.instance.state !== "open") continue;

      instancesOpen += 1;
      const result = await recoverFailedWhatsappJobsForInstance(instanceName);
      recovered += result.recovered;
      discarded += result.discarded;
    } catch (error: any) {
      console.warn(`[WhatsApp recovery] Could not inspect ${instanceName}: ${error?.message || error}`);
    }
  }

  return {
    instancesChecked: instanceNames.length,
    instancesOpen,
    recovered,
    discarded,
  };
}

export function reconcileRecoverableWhatsappJobs() {
  if (!reconciliationRun) {
    reconciliationRun = runWhatsappRecoveryReconciliation().finally(() => {
      reconciliationRun = null;
    });
  }
  return reconciliationRun;
}
