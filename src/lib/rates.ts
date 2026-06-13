"use server";

export type Rates = {
  cnyToBrl: number;
  usdToBrl: number;
  usdToCny: number;
  /** Source timestamp from the quote provider (or our fetch time on fallback). */
  updatedAt: string;
  /** false when the live fetch failed and we fell back to defaults. */
  live: boolean;
};

// Used when the provider is unreachable so the UI still has sane, editable values.
const FALLBACK: Rates = {
  cnyToBrl: 0.75,
  usdToBrl: 5.4,
  usdToCny: 7.1,
  updatedAt: new Date().toISOString(),
  live: false,
};

/**
 * Live USD/CNY/BRL quotes from AwesomeAPI (free, no key, Brazilian provider).
 * https://docs.awesomeapi.com.br/api-de-moedas
 */
export async function getRates(): Promise<Rates> {
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL,CNY-BRL,USD-CNY",
      // Cache for 30 min so we don't hammer the provider on every render.
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    const usdToBrl = Number(data?.USDBRL?.bid);
    const cnyToBrl = Number(data?.CNYBRL?.bid);
    const usdToCny = Number(data?.USDCNY?.bid);
    if (![usdToBrl, cnyToBrl, usdToCny].every((n) => Number.isFinite(n) && n > 0)) {
      return FALLBACK;
    }
    return {
      usdToBrl,
      cnyToBrl,
      usdToCny,
      updatedAt: data?.USDBRL?.create_date ?? new Date().toISOString(),
      live: true,
    };
  } catch {
    return FALLBACK;
  }
}
