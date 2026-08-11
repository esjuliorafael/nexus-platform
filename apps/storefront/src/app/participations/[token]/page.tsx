import type { Metadata } from "next";
import type { RaffleParticipationAccessResponse } from "../../../api/raffles";
import { ParticipationAccessClient } from "./ParticipationAccessClient";

export const metadata: Metadata = {
  title: "Mi participaci\u00f3n",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getInitialAccess(token: string): Promise<RaffleParticipationAccessResponse | null> {
  const apiBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const response = await fetch(
      `${apiBase}/raffles/participations/${encodeURIComponent(token)}?ssr_ts=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as RaffleParticipationAccessResponse;
  } catch {
    return null;
  }
}

export default async function ParticipationAccessPage({ params }: { params: { token: string } }) {
  const initialData = await getInitialAccess(params.token);
  return <ParticipationAccessClient token={params.token} initialData={initialData} />;
}
