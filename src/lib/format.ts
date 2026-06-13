const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const cny = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "CNY",
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const num = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

export const formatBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const formatCNY = (v: number) => cny.format(Number.isFinite(v) ? v : 0);
export const formatUSD = (v: number) => usd.format(Number.isFinite(v) ? v : 0);
export const formatNum = (v: number) => num.format(Number.isFinite(v) ? v : 0);
