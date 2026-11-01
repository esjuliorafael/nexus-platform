import type { Job } from "bullmq";
import type { WhatsappJobData } from "../../../queues/whatsapp.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { getRafflePaymentInstructionsJobId } from "./raffle-payment-instructions";

export async function enqueueRafflePaymentInstructionsAfterDelivery(
  job: Pick<Job<WhatsappJobData>, "id" | "data">,
) {
  const data = job.data;
  if (data.kind !== "reservation" && data.kind !== "reservation-restored") {
    return false;
  }

  const sourceJobId = data.sourceJobId || String(job.id || "");
  if (!sourceJobId) return false;

  await whatsappQueue.add(
    "raffle-payment-instructions",
    {
      kind: "raffle-payment-instructions",
      sourceKind: data.kind,
      ticketSaleIds: data.ticketSaleIds,
      recipientPhone: data.recipientPhone,
      timeLimit: "timeLimit" in data ? data.timeLimit : undefined,
      participationUrl: "participationUrl" in data ? data.participationUrl : undefined,
      forcePrincipal: data.forcePrincipal,
      forceProvider: data.forceProvider,
    },
    { jobId: getRafflePaymentInstructionsJobId(sourceJobId) },
  );
  return true;
}
