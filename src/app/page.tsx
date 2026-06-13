import { listShippingMethods } from "./shipping-methods/actions";
import { getRates } from "@/lib/rates";
import { Calculator } from "@/components/calculator";

// Always render fresh so newly added/edited methods show up without a manual reload.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [methods, rates] = await Promise.all([
    listShippingMethods(),
    getRates(),
  ]);
  return <Calculator methods={methods} initialRates={rates} />;
}
