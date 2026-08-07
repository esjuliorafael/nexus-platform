import type { Metadata } from "next";
import { ParticipationAccessClient } from "./ParticipationAccessClient";

export const metadata: Metadata = {
  title: "Mi participaci\u00f3n",
  robots: { index: false, follow: false },
};

export default function ParticipationAccessPage({ params }: { params: { token: string } }) {
  return <ParticipationAccessClient token={params.token} />;
}
