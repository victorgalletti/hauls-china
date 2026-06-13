import { listShippingMethods } from "@/app/shipping-methods/actions";
import { getRates } from "@/lib/rates";
import { PurchaseBuilder } from "@/components/purchase-builder";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [methods, rates] = await Promise.all([
    listShippingMethods(),
    getRates(),
  ]);
  return <PurchaseBuilder methods={methods} initialRates={rates} />;
}
