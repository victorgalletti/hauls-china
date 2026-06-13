import { listPurchases } from "./actions";
import { PurchasesList } from "@/components/purchases-list";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await listPurchases();
  return <PurchasesList purchases={purchases} />;
}
