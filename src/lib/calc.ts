import type { RoundingMode, ShippingMethodDTO } from "./shipping";

/** US$50 Remessa Conforme exemption threshold. */
export const REMESSA_CONFORME_THRESHOLD_USD = 50;

export function billedExtraKg(
  weightKg: number,
  baseWeightKg: number,
  roundingMode: RoundingMode,
): number {
  const extra = weightKg - baseWeightKg;
  if (extra <= 0) return 0;
  return roundingMode === "ceil" ? Math.ceil(extra) : extra;
}

/** Freight price in CNY for a given weight on a given method. */
export function freightCny(method: ShippingMethodDTO, weightKg: number): number {
  const extra = billedExtraKg(weightKg, method.baseWeightKg, method.roundingMode);
  return method.basePriceCny + method.extraPricePerKgCny * extra;
}

export function isWeightInRange(
  method: ShippingMethodDTO,
  weightKg: number,
): boolean {
  return weightKg >= method.minWeightKg && weightKg <= method.maxWeightKg;
}

export type CalcInput = {
  method: ShippingMethodDTO | null;
  productPriceCny: number;
  weightKg: number;
  // Exchange rates (3 currencies: CNY, USD, BRL).
  cnyToBrl: number;
  usdToBrl: number;
  // Insurance premium charged by the agent (CNY), added to what you pay.
  insuranceCny: number;
  // Tax knobs.
  importTaxPct: number;
  icmsPct: number;
  marginPct: number;
  exemptionEnabled: boolean;
  /**
   * Declared (customs) value in USD. When null the calculator uses the
   * method-derived default (product, or product + freight). Always overridable.
   */
  declaredValueUsd: number | null;
};

export type CalcResult = {
  freightCny: number;
  freightBrl: number;
  productBrl: number;
  insuranceBrl: number;
  // CNY → USD derived rate (cnyToBrl / usdToBrl).
  cnyToUsd: number;
  // The default declared value (USD) implied by the chosen method.
  declaredDefaultUsd: number;
  // The declared value actually used (override or default), USD and BRL.
  declaredValueUsd: number;
  declaredValueBrl: number;
  // Cost you actually pay (product + freight), BRL.
  goodsBrl: number;
  // Portion of the declared value subject to import tax (USD).
  taxableUsd: number;
  importTaxBrl: number;
  icmsBrl: number;
  subtotalBeforeMargin: number;
  finalPrice: number;
};

/**
 * Full cost breakdown.
 *
 * Money flow:
 *  - You pay for the goods (product + freight), both quoted in CNY → BRL.
 *  - Brazilian taxes are levied on the *declared* (customs) value, in USD.
 *    The declared value defaults to the product (or product + freight, per the
 *    shipping method) but the user can declare any value.
 *  - Import tax: with the Remessa Conforme exemption only the portion above
 *    US$50 is taxed; otherwise the whole declared value is taxed.
 *  - ICMS is levied on the declared value plus the import tax.
 */
export function calculate(input: CalcInput): CalcResult {
  const {
    method,
    productPriceCny,
    weightKg,
    cnyToBrl,
    usdToBrl,
    insuranceCny,
    importTaxPct,
    icmsPct,
    marginPct,
    exemptionEnabled,
    declaredValueUsd: declaredOverride,
  } = input;

  const cnyToUsd = usdToBrl > 0 ? cnyToBrl / usdToBrl : 0;

  // No weight entered means nothing to ship yet, so freight stays at zero
  // instead of showing the method's base price.
  const fCny = method && weightKg > 0 ? freightCny(method, weightKg) : 0;
  const freightBrl = fCny * cnyToBrl;
  const productBrl = productPriceCny * cnyToBrl;
  const insuranceBrl = insuranceCny * cnyToBrl;
  const goodsBrl = productBrl + freightBrl + insuranceBrl;

  // Default declared value (USD) from the method's base preference.
  const declaredBaseCny =
    productPriceCny + (method?.declaredIncludesFreight ? fCny : 0);
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

  const subtotalBeforeMargin = goodsBrl + importTaxBrl + icmsBrl;
  const finalPrice = subtotalBeforeMargin * (1 + marginPct / 100);

  return {
    freightCny: fCny,
    freightBrl,
    productBrl,
    insuranceBrl,
    cnyToUsd,
    declaredDefaultUsd,
    declaredValueUsd,
    declaredValueBrl,
    goodsBrl,
    taxableUsd,
    importTaxBrl,
    icmsBrl,
    subtotalBeforeMargin,
    finalPrice,
  };
}
