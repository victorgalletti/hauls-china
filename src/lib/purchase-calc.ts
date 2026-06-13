import { billedExtraKg } from "./calc";
import { REMESSA_CONFORME_THRESHOLD_USD } from "./calc";
import type { RoundingMode } from "./shipping";

/** Shipping method pricing needed to compute package freight. */
export type MethodSnapshot = {
  baseWeightKg: number;
  basePriceCny: number;
  extraPricePerKgCny: number;
  roundingMode: RoundingMode;
  declaredIncludesFreight: boolean;
};

export type PackageParams = {
  method: MethodSnapshot | null;
  cnyToBrl: number;
  usdToBrl: number;
  insuranceCny: number;
  importTaxPct: number;
  icmsPct: number;
  marginPct: number;
  exemptionEnabled: boolean;
  /** Optional package-level declared value (USD). null = method-derived default. */
  declaredValueUsd: number | null;
};

export type PackageItem = {
  id: string;
  name: string;
  category?: string | null;
  person?: string | null;
  weightKg: number;
  priceCny: number;
  imageUrl?: string | null;
  link?: string | null;
  /** Whether the markup/margin applies to this item. */
  applyMargin: boolean;
};

export type ItemResult = PackageItem & {
  /** Fraction of the package weight (0..1). */
  share: number;
  productBrl: number;
  /** Weight-allocated share of freight + insurance + taxes (BRL). */
  sharedBrl: number;
  /** productBrl + sharedBrl (BRL). */
  costBrl: number;
  /** costBrl × (1 + margin) when margin applies, else costBrl. */
  finalBrl: number;
  /** finalBrl − costBrl (the markup portion, 0 when margin is off). */
  marginBrl: number;
};

export type PersonResult = {
  person: string;
  weightKg: number;
  costBrl: number;
  marginBrl: number;
  finalBrl: number;
  itemCount: number;
};

export type PackageResult = {
  totalWeightKg: number;
  totalProductCny: number;
  freightCny: number;
  freightBrl: number;
  insuranceBrl: number;
  declaredValueUsd: number;
  declaredDefaultUsd: number;
  declaredValueBrl: number;
  taxableUsd: number;
  importTaxBrl: number;
  icmsBrl: number;
  /** Costs split across items by weight: freight + insurance + import tax + ICMS. */
  sharedCostBrl: number;
  goodsBrl: number;
  subtotalBeforeMargin: number;
  /** Total markup added across all items (sum of per-item margins). */
  totalMarginBrl: number;
  finalTotalBrl: number;
  items: ItemResult[];
  people: PersonResult[];
};

function freightForPackage(method: MethodSnapshot, weightKg: number): number {
  const extra = billedExtraKg(weightKg, method.baseWeightKg, method.roundingMode);
  return method.basePriceCny + method.extraPricePerKgCny * extra;
}

/**
 * Compute a shared package: freight on the summed weight, plus insurance and
 * taxes, then split those shared costs across items proportionally to weight
 * (rule of three). Each item also carries its own product price. Finally grouped
 * per recipient.
 */
export function calculatePackage(
  params: PackageParams,
  items: PackageItem[],
): PackageResult {
  const {
    method,
    cnyToBrl,
    usdToBrl,
    insuranceCny,
    importTaxPct,
    icmsPct,
    marginPct,
    exemptionEnabled,
    declaredValueUsd: declaredOverride,
  } = params;

  const cnyToUsd = usdToBrl > 0 ? cnyToBrl / usdToBrl : 0;
  const totalWeightKg = items.reduce((s, i) => s + (i.weightKg || 0), 0);
  const totalProductCny = items.reduce((s, i) => s + (i.priceCny || 0), 0);

  const freightCny =
    method && totalWeightKg > 0 ? freightForPackage(method, totalWeightKg) : 0;
  const freightBrl = freightCny * cnyToBrl;
  const insuranceBrl = insuranceCny * cnyToBrl;
  const goodsBrl = totalProductCny * cnyToBrl;

  const declaredBaseCny =
    totalProductCny + (method?.declaredIncludesFreight ? freightCny : 0);
  const declaredDefaultUsd = declaredBaseCny * cnyToUsd;
  const declaredValueUsd =
    declaredOverride !== null && declaredOverride !== undefined
      ? declaredOverride
      : declaredDefaultUsd;
  const declaredValueBrl = declaredValueUsd * usdToBrl;

  const taxableUsd = exemptionEnabled
    ? Math.max(0, declaredValueUsd - REMESSA_CONFORME_THRESHOLD_USD)
    : declaredValueUsd;
  const importTaxBrl = taxableUsd * usdToBrl * (importTaxPct / 100);
  const icmsBrl = (declaredValueBrl + importTaxBrl) * (icmsPct / 100);

  const sharedCostBrl = freightBrl + insuranceBrl + importTaxBrl + icmsBrl;
  const subtotalBeforeMargin = goodsBrl + sharedCostBrl;
  const marginMult = 1 + marginPct / 100;

  // Margin is applied per item (only to items flagged for it, e.g. resold to
  // others), so the package total is the sum of the item finals.
  const itemResults: ItemResult[] = items.map((it) => {
    const share = totalWeightKg > 0 ? (it.weightKg || 0) / totalWeightKg : 0;
    const productBrl = (it.priceCny || 0) * cnyToBrl;
    const sharedBrl = sharedCostBrl * share;
    const costBrl = productBrl + sharedBrl;
    const finalBrl = it.applyMargin ? costBrl * marginMult : costBrl;
    return {
      ...it,
      share,
      productBrl,
      sharedBrl,
      costBrl,
      finalBrl,
      marginBrl: finalBrl - costBrl,
    };
  });

  const finalTotalBrl = itemResults.reduce((s, i) => s + i.finalBrl, 0);
  const totalMarginBrl = itemResults.reduce((s, i) => s + i.marginBrl, 0);

  // Group per recipient.
  const byPerson = new Map<string, PersonResult>();
  for (const it of itemResults) {
    const person = it.person?.trim() || "Sem destinatário";
    const cur =
      byPerson.get(person) ??
      { person, weightKg: 0, costBrl: 0, marginBrl: 0, finalBrl: 0, itemCount: 0 };
    cur.weightKg += it.weightKg || 0;
    cur.costBrl += it.costBrl;
    cur.marginBrl += it.marginBrl;
    cur.finalBrl += it.finalBrl;
    cur.itemCount += 1;
    byPerson.set(person, cur);
  }

  return {
    totalWeightKg,
    totalProductCny,
    freightCny,
    freightBrl,
    insuranceBrl,
    declaredValueUsd,
    declaredDefaultUsd,
    declaredValueBrl,
    taxableUsd,
    importTaxBrl,
    icmsBrl,
    sharedCostBrl,
    goodsBrl,
    subtotalBeforeMargin,
    totalMarginBrl,
    finalTotalBrl,
    items: itemResults,
    people: Array.from(byPerson.values()).sort((a, b) =>
      a.person.localeCompare(b.person),
    ),
  };
}
