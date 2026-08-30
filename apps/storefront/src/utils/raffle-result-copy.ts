import type { Raffle, RafflePrize } from "../types";

const raffleResultSourceLabel = (
  prize?: Pick<RafflePrize, "resultSource" | "resultSourceLabel">,
) => {
  if (!prize) return "Premio Mayor";
  if (prize.resultSource === "CUSTOM") {
    return prize.resultSourceLabel?.trim() || "referencia oficial configurada";
  }
  return {
    MAJOR_PRIZE: "Premio Mayor",
    SECOND_PRIZE: "Segundo Premio",
    THIRD_PRIZE: "Tercer Premio",
  }[prize.resultSource];
};

const orderedPrizes = (raffle: Raffle) =>
  [...(raffle.prizes || [])].sort((a, b) => a.position - b.position);

export function getRaffleResultDescription(raffle: Raffle) {
  const prizes = orderedPrizes(raffle);
  const digitLabel = raffle.digits === 1 ? "dígito" : "dígitos";

  if (prizes.length <= 1) {
    const source = raffleResultSourceLabel(prizes[0]);
    if (source === "Premio Mayor") {
      return `El número ganador se determina con los últimos ${raffle.digits} ${digitLabel} del Premio Mayor de la Lotería Nacional.`;
    }
    return `El número ganador se determina con los últimos ${raffle.digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a este lugar: ${source}.`;
  }

  return `Cada lugar tiene un número ganador propio. Para determinarlo, se utilizan los últimos ${raffle.digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a ese lugar.`;
}

export function getRaffleReferenceNote(raffle: Raffle) {
  const prizes = orderedPrizes(raffle);
  const source = raffleResultSourceLabel(prizes[0]);

  if (prizes.length <= 1) {
    if (source === "Premio Mayor") {
      return "Esta rifa toma como referencia el resultado público del Premio Mayor de la Lotería Nacional.";
    }
    return `Esta rifa toma como referencia el resultado público de la Lotería Nacional asignado a este lugar (${source}).`;
  }

  return "Esta rifa toma como referencia los resultados públicos de la Lotería Nacional definidos para cada lugar.";
}

export function getRafflePublishedReferenceText(raffle: Raffle) {
  const prizes = orderedPrizes(raffle);
  const digitLabel = raffle.digits === 1 ? "dígito" : "dígitos";

  if (prizes.length <= 1) {
    const source = raffleResultSourceLabel(prizes[0]);
    if (source === "Premio Mayor") {
      return `El resultado se determinó con los últimos ${raffle.digits} ${digitLabel} del Premio Mayor de la Lotería Nacional.`;
    }
    return `El resultado se determinó con los últimos ${raffle.digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a este lugar: ${source}.`;
  }

  return `Los resultados se determinaron con los últimos ${raffle.digits} ${digitLabel} de las referencias oficiales de la Lotería Nacional asignadas a cada lugar.`;
}
