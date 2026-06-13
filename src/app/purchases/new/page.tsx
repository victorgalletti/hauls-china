import { listShippingMethods } from "@/app/shipping-methods/actions";
import { PurchaseBuilder } from "@/components/purchase-builder";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const methods = await listShippingMethods();
  return <PurchaseBuilder methods={methods} />;
}
