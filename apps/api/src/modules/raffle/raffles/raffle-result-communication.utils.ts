import { RaffleResultCampaignStatus } from "@prisma/client-raffle";

export const rafflePrizePlaceLabel = (position: number) => {
  if (position === 1) return "Primer lugar";
  if (position === 2) return "Segundo lugar";
  if (position === 3) return "Tercer lugar";
  return `Lugar ${position}`;
};

type RaffleReferencePrize = {
  position: number;
  resultSource: string;
  resultSourceLabel?: string | null;
};

const raffleResultSourceLabel = (prize: RaffleReferencePrize) => {
  if (prize.resultSource === "CUSTOM") {
    return prize.resultSourceLabel?.trim() || "referencia oficial configurada";
  }

  return (
    {
      MAJOR_PRIZE: "Premio Mayor",
      SECOND_PRIZE: "Segundo Premio",
      THIRD_PRIZE: "Tercer Premio",
    } as Record<string, string>
  )[prize.resultSource] || "referencia oficial configurada";
};

const rafflePrizeOrdinalLabel = (position: number) => {
  if (position === 1 || position === 3) return `${position}.er lugar`;
  return `${position}.º lugar`;
};

const raffleReferenceWithArticle = (source: string) =>
  ["Premio Mayor", "Segundo Premio", "Tercer Premio"].includes(source)
    ? `el ${source}`
    : `la referencia \"${source}\"`;

export const buildRaffleWinningRuleText = (
  digits: number,
  prizes: RaffleReferencePrize[],
) => {
  const orderedPrizes = [...prizes].sort((a, b) => a.position - b.position);
  const digitLabel = digits === 1 ? "dígito" : "dígitos";

  if (orderedPrizes.length <= 1) {
    const source = raffleResultSourceLabel(orderedPrizes[0] || {
      position: 1,
      resultSource: "MAJOR_PRIZE",
    });
    if (source === "Premio Mayor") {
      return `El número ganador se determina con los últimos ${digits} ${digitLabel} del Premio Mayor de la Lotería Nacional.`;
    }
    return `El número ganador se determina con los últimos ${digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a este lugar: ${source}.`;
  }

  const references = orderedPrizes.map((prize, index) => {
    const source = raffleResultSourceLabel(prize);
    const prefix = index === orderedPrizes.length - 1 ? "y " : "";
    return `${prefix}para el ${rafflePrizeOrdinalLabel(prize.position)}${index === 0 ? " se utiliza" : ","} ${raffleReferenceWithArticle(source)}`;
  });
  return `Cada lugar tiene un número ganador propio, que se obtiene a partir de los últimos ${digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a ese lugar: ${references.join("; ")}.`;
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
