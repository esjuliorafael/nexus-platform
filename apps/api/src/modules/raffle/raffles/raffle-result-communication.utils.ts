import { RaffleResultCampaignStatus } from "@prisma/client-raffle";

export const rafflePrizePlaceLabel = (position: number) => {
  if (position === 1) return "Primer lugar";
  if (position === 2) return "Segundo lugar";
  if (position === 3) return "Tercer lugar";
  return `Lugar ${position}`;
};

export const renderRaffleResultList = (
  prizes: Array<{
    position: number;
    winningNumber: string | null;
    winningTicketNumber: string | null;
    resultResolutionStatus: string | null;
  }>,
) =>
  prizes
    .map((prize) => {
      const eligibility =
        prize.resultResolutionStatus === "ELIGIBLE_WINNER"
          ? ""
          : " (sin ganador elegible)";
      return `${rafflePrizePlaceLabel(prize.position)}: número ${prize.winningNumber || "sin resultado"}, boleto ${prize.winningTicketNumber || "sin boleto"}${eligibility}`;
    })
    .join("\n");

export type ResultProviderState = "ACCEPTED" | "DELIVERED" | "FAILED";

export const classifyResultProviderState = (
  log:
    | {
        status: string;
        providerStatus: string | null;
      }
    | null
    | undefined,
): ResultProviderState => {
  if (!log) return "ACCEPTED";
  const value = `${log.status} ${log.providerStatus || ""}`.toLowerCase();
  if (
    ["fail", "error", "reject", "undeliver"].some((token) =>
      value.includes(token),
    )
  ) {
    return "FAILED";
  }
  if (
    ["delivered", "delivery_ack", "read", "read_ack", "played"].some((token) =>
      value.includes(token),
    )
  ) {
    return "DELIVERED";
  }
  return "ACCEPTED";
};

export const deriveRaffleResultCampaignStatus = ({
  sentCount,
  failedCount,
  processingCount,
}: {
  sentCount: number;
  failedCount: number;
  processingCount: number;
}) => {
  const totalRecipients = sentCount + failedCount + processingCount;
  if (totalRecipients === 0) return RaffleResultCampaignStatus.EMPTY;
  if (processingCount > 0) {
    return sentCount > 0 || failedCount > 0
      ? RaffleResultCampaignStatus.PARTIAL
      : RaffleResultCampaignStatus.PROCESSING;
  }
  if (failedCount === 0) return RaffleResultCampaignStatus.SENT;
  return sentCount > 0
    ? RaffleResultCampaignStatus.PARTIAL
    : RaffleResultCampaignStatus.FAILED;
};
