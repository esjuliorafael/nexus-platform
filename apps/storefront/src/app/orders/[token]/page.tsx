import type { Metadata } from "next";
import type { StoreOrderAccessResponse } from "../../../api/orders";
import { OrderAccessClient } from "./OrderAccessClient";

export const metadata: Metadata = {
  title: "Mi orden",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getInitialAccess(token: string): Promise<StoreOrderAccessResponse | null> {
  const apiBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const response = await fetch(
      `${apiBase}/store/orders/access/${encodeURIComponent(token)}?ssr_ts=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as StoreOrderAccessResponse;
  } catch {
    return null;
  }
}

export default async function OrderAccessPage({ params }: { params: { token: string } }) {
  const initialData = await getInitialAccess(params.token);
  return <OrderAccessClient token={params.token} initialData={initialData} />;
}
