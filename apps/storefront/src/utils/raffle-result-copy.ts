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

const rafflePrizeOrdinalLabel = (position: number) => {
  if (position === 1 || position === 3) return `${position}.er lugar`;
  return `${position}.º lugar`;
};

const raffleReferenceWithArticle = (source: string) =>
  ["Premio Mayor", "Segundo Premio", "Tercer Premio"].includes(source)
    ? `el ${source}`
    : `la referencia \"${source}\"`;

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

  const references = prizes.map((prize, index) => {
    const source = raffleResultSourceLabel(prize);
    const prefix = index === prizes.length - 1 ? "y " : "";
    return `${prefix}para el ${rafflePrizeOrdinalLabel(prize.position)}${index === 0 ? " se utiliza" : ","} ${raffleReferenceWithArticle(source)}`;
  });
  return `Cada lugar tiene un número ganador propio, que se obtiene a partir de los últimos ${raffle.digits} ${digitLabel} de la referencia oficial de la Lotería Nacional asignada a ese lugar: ${references.join("; ")}.`;
}

export function getRaffleReferenceNote(raffle: Raffle) {
  const prizes = orderedPrizes(raffle);
  const source = raffleResultSourceLabel(prizes[0]);

  if (prizes.length <= 1) {
    if (source === "Premio Mayor") {
      return "Esta rifa toma como referencia el resultado público del Premio Mayor de la Lotería Nacional para definir el número ganador.";
    }
    return `Esta rifa toma como referencia el resultado público de la Lotería Nacional asignado a este lugar (${source}) para definir el número ganador.`;
  }

  return "Esta rifa toma como referencia los resultados públicos de la Lotería Nacional definidos para cada lugar. El número ganador de cada lugar se obtiene a partir de los últimos dígitos de su referencia correspondiente.";
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
