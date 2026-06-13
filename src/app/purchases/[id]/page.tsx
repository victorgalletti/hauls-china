import { notFound } from "next/navigation";
import { listShippingMethods } from "@/app/shipping-methods/actions";
import { getPurchase } from "../actions";
import { getRates } from "@/lib/rates";
import { PurchaseBuilder } from "@/components/purchase-builder";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [purchase, methods, rates] = await Promise.all([
    getPurchase(id),
    listShippingMethods(),
    getRates(),
  ]);
  if (!purchase) notFound();
  return (
    <PurchaseBuilder methods={methods} initialRates={rates} purchase={purchase} />
  );
}
