import { listShippingMethods } from "./actions";
import { ShippingMethodsManager } from "@/components/shipping-methods-manager";

export const dynamic = "force-dynamic";

export default async function ShippingMethodsPage() {
  const methods = await listShippingMethods();
  return <ShippingMethodsManager methods={methods} />;
}
