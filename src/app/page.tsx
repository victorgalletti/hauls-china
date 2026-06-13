import { listShippingMethods } from "./shipping-methods/actions";
import { Calculator } from "@/components/calculator";

// Always render fresh so newly added/edited methods show up without a manual reload.
export const dynamic = "force-dynamic";

export default async function Home() {
  const methods = await listShippingMethods();
  return <Calculator methods={methods} />;
}
