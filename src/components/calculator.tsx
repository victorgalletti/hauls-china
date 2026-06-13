"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculate, isWeightInRange, billedExtraKg } from "@/lib/calc";
import { formatBRL, formatCNY, formatUSD, formatNum } from "@/lib/format";
import { getRates, type Rates } from "@/lib/rates";
import type { ShippingMethodDTO } from "@/lib/shipping";

type WeightUnit = "g" | "kg";

function toNum(v: string): number {
  if (v.trim() === "") return 0;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
};

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          type="number"
          step="any"
          min="0"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-14" : undefined}
        />
        {suffix ? (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
        {sub ? (
          <span className="text-muted-foreground/70 ml-1 text-xs">{sub}</span>
        ) : null}
      </span>
      <span className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

export function Calculator({
  methods,
  initialRates,
}: {
  methods: ShippingMethodDTO[];
  initialRates: Rates;
}) {
  const [productPriceCny, setProductPriceCny] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("g");
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [cnyToBrl, setCnyToBrl] = useState(String(initialRates.cnyToBrl));
  const [usdToBrl, setUsdToBrl] = useState(String(initialRates.usdToBrl));
  const [rateInfo, setRateInfo] = useState({
    updatedAt: initialRates.updatedAt,
    live: initialRates.live,
  });
  const [insuranceCny, setInsuranceCny] = useState("0");
  const [importTaxPct, setImportTaxPct] = useState("60");
  const [icmsPct, setIcmsPct] = useState("17");
  const [marginPct, setMarginPct] = useState("0");
  const [exemptionEnabled, setExemptionEnabled] = useState(false);
  // Empty string = use the method-derived default declared value.
  const [declaredUsd, setDeclaredUsd] = useState("");
  const [refreshing, startRefresh] = useTransition();

  const weightKg = weightUnit === "g" ? toNum(weightValue) / 1000 : toNum(weightValue);
  const method = methods.find((m) => m.id === methodId) ?? null;
  const outOfRange = method ? !isWeightInRange(method, weightKg) : false;

  const result = useMemo(
    () =>
      calculate({
        method,
        productPriceCny: toNum(productPriceCny),
        weightKg,
        cnyToBrl: toNum(cnyToBrl),
        usdToBrl: toNum(usdToBrl),
        insuranceCny: toNum(insuranceCny),
        importTaxPct: toNum(importTaxPct),
        icmsPct: toNum(icmsPct),
        marginPct: toNum(marginPct),
        exemptionEnabled,
        declaredValueUsd: declaredUsd.trim() === "" ? null : toNum(declaredUsd),
      }),
    [
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
      declaredUsd,
    ],
  );

  const extraKg = method
    ? billedExtraKg(weightKg, method.baseWeightKg, method.roundingMode)
    : 0;

  function refreshRates() {
    startRefresh(async () => {
      const r = await getRates();
      setCnyToBrl(String(r.cnyToBrl));
      setUsdToBrl(String(r.usdToBrl));
      setRateInfo({ updatedAt: r.updatedAt, live: r.live });
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Calculadora de importação
        </h1>
        <p className="text-muted-foreground text-sm">
          Custo final em BRL de compras em agentes chineses (CSSBuy etc.)
          enviadas ao Brasil.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Inputs */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Dados da compra</CardTitle>
            <CardDescription>
              Os resultados são recalculados automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="product"
                label="Preço do produto"
                suffix="CNY"
                value={productPriceCny}
                onChange={setProductPriceCny}
              />
              {/* Weight + unit */}
              <div className="space-y-1.5">
                <Label htmlFor="weight">Peso</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    inputMode="decimal"
                    type="number"
                    step="any"
                    min="0"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                  />
                  <Select
                    value={weightUnit}
                    onValueChange={(v) => setWeightUnit(v as WeightUnit)}
                  >
                    <SelectTrigger className="w-24" aria-label="Unidade de peso">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-muted-foreground text-xs">
                  = {formatNum(weightKg)} kg
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method">Método de envio</Label>
              {methods.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  Nenhum método cadastrado.{" "}
                  <Link
                    href="/shipping-methods"
                    className="text-foreground underline"
                  >
                    Cadastre um método
                  </Link>{" "}
                  para começar.
                </p>
              ) : (
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger id="method" className="w-full">
                    <SelectValue placeholder="Selecione um método" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => {
                      const fits = isWeightInRange(m, weightKg);
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({formatNum(m.minWeightKg)}–{formatNum(m.maxWeightKg)}{" "}
                            kg){!fits ? " ⚠" : ""}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {method ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {method.etaDays ? (
                    <Badge variant="secondary">{method.etaDays}</Badge>
                  ) : null}
                  <Badge variant="outline">
                    declara{" "}
                    {method.declaredIncludesFreight ? "produto + frete" : "produto"}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Base {formatNum(method.baseWeightKg)} kg ={" "}
                    {formatCNY(method.basePriceCny)} +{" "}
                    {formatCNY(method.extraPricePerKgCny)}/kg ·{" "}
                    {method.roundingMode === "ceil"
                      ? "arredonda p/ cima"
                      : "proporcional"}
                  </span>
                </div>
              ) : null}
              {outOfRange ? (
                <p className="flex items-center gap-1.5 pt-1 text-sm text-amber-600 dark:text-amber-500">
                  <AlertTriangle className="size-4" />
                  Peso {formatNum(weightKg)} kg fora da faixa deste método (
                  {formatNum(method!.minWeightKg)}–{formatNum(method!.maxWeightKg)}{" "}
                  kg).
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="cnyBrl"
                label="Câmbio CNY → BRL"
                value={cnyToBrl}
                onChange={setCnyToBrl}
              />
              <NumberField
                id="usdBrl"
                label="Câmbio USD → BRL"
                value={usdToBrl}
                onChange={setUsdToBrl}
              />
              <NumberField
                id="importTax"
                label="Imposto de importação"
                suffix="%"
                value={importTaxPct}
                onChange={setImportTaxPct}
              />
              <NumberField
                id="icms"
                label="ICMS"
                suffix="%"
                value={icmsPct}
                onChange={setIcmsPct}
              />
              <NumberField
                id="margin"
                label="Margem"
                suffix="%"
                value={marginPct}
                onChange={setMarginPct}
              />
              <NumberField
                id="insurance"
                label="Seguro"
                suffix="CNY"
                value={insuranceCny}
                onChange={setInsuranceCny}
              />
            </div>

            <Separator />

            {/* Declared value (open / editable, USD) */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="declared">Valor declarado (alfândega)</Label>
                  {declaredUsd.trim() !== "" ? (
                    <button
                      type="button"
                      onClick={() => setDeclaredUsd("")}
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                    >
                      usar padrão
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="declared"
                    inputMode="decimal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder={formatNum(result.declaredDefaultUsd)}
                    value={declaredUsd}
                    onChange={(e) => setDeclaredUsd(e.target.value)}
                    className="pr-14"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                    USD
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {declaredUsd.trim() === ""
                    ? `Padrão (${
                        method?.declaredIncludesFreight
                          ? "produto + frete"
                          : "produto"
                      }): ${formatUSD(result.declaredDefaultUsd)} · `
                    : "Valor personalizado · "}
                  ≈ {formatBRL(result.declaredValueBrl)}
                </p>
              </div>

              <div className="flex items-start justify-between gap-3 border-t pt-3">
                <div className="space-y-0.5">
                  <Label htmlFor="exemption" className="text-sm">
                    Remessa Conforme (isenção até US$50)
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    O imposto incide só sobre o valor declarado que exceder
                    US$50.
                  </p>
                </div>
                <Switch
                  id="exemption"
                  checked={exemptionEnabled}
                  onCheckedChange={setExemptionEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2 lg:sticky lg:top-6 h-fit">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Detalhamento em BRL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <div className="pb-1">
                <Row label="Produto" value={formatBRL(result.productBrl)} />
                <Row
                  label="Frete"
                  sub={
                    method
                      ? `${formatCNY(result.freightCny)} · base + ${formatNum(extraKg)} kg`
                      : undefined
                  }
                  value={formatBRL(result.freightBrl)}
                />
                {toNum(insuranceCny) > 0 ? (
                  <Row
                    label="Seguro"
                    sub={formatCNY(toNum(insuranceCny))}
                    value={formatBRL(result.insuranceBrl)}
                  />
                ) : null}
                <Row
                  label="Custo das mercadorias"
                  value={formatBRL(result.goodsBrl)}
                  emphasis
                />
              </div>
              <div className="py-1">
                <Row
                  label="Valor declarado"
                  sub={`${formatUSD(result.declaredValueUsd)}`}
                  value={formatBRL(result.declaredValueBrl)}
                />
                <Row
                  label={`Imposto de importação (${formatNum(toNum(importTaxPct))}%)`}
                  sub={
                    exemptionEnabled
                      ? `sobre ${formatUSD(result.taxableUsd)} acima de US$50`
                      : "sobre o valor declarado"
                  }
                  value={formatBRL(result.importTaxBrl)}
                />
                <Row
                  label={`ICMS (${formatNum(toNum(icmsPct))}%)`}
                  sub="declarado + imposto"
                  value={formatBRL(result.icmsBrl)}
                />
              </div>
              <div className="py-1">
                <Row
                  label="Subtotal (antes da margem)"
                  value={formatBRL(result.subtotalBeforeMargin)}
                  emphasis
                />
              </div>
            </div>

            <div className="bg-primary text-primary-foreground mt-4 rounded-lg p-4">
              <div className="text-xs opacity-80">
                Preço final{" "}
                {toNum(marginPct) > 0
                  ? `(margem ${formatNum(toNum(marginPct))}%)`
                  : ""}
              </div>
              <div className="text-3xl font-semibold tabular-nums">
                {formatBRL(result.finalPrice)}
              </div>
            </div>

            {!method ? (
              <p className="text-muted-foreground mt-3 text-xs">
                Selecione um método de envio para incluir o frete.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Exchange rates bar (below the purchase data) */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-sm">
          <span className="text-muted-foreground">Cotações</span>
          <span className="tabular-nums">
            <span className="text-muted-foreground">USD→BRL</span>{" "}
            {formatNum(toNum(usdToBrl))}
          </span>
          <span className="tabular-nums">
            <span className="text-muted-foreground">CNY→BRL</span>{" "}
            {formatNum(toNum(cnyToBrl))}
          </span>
          <span className="tabular-nums">
            <span className="text-muted-foreground">CNY→USD</span>{" "}
            {formatNum(result.cnyToUsd)}
          </span>
          <span className="text-muted-foreground text-xs">
            {rateInfo.live ? "ao vivo" : "offline (padrão)"} ·{" "}
            {rateInfo.updatedAt?.slice(0, 16).replace("T", " ")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRates}
            disabled={refreshing}
            className="ml-auto"
          >
            <RefreshCw
              className={refreshing ? "size-4 animate-spin" : "size-4"}
            />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <FormulaNote />
    </div>
  );
}

function FormulaNote() {
  return (
    <Card className="bg-muted/40">
      <CardContent className="text-muted-foreground space-y-2 py-4 text-xs leading-relaxed">
        <p className="text-foreground font-medium">Como o cálculo funciona</p>
        <p>
          O frete tem <strong>peso base</strong> com preço fixo; o excedente é
          cobrado por kg adicional (<code>ceil</code> arredonda para cima,{" "}
          <code>linear</code> é proporcional). Você paga produto + frete (CNY →
          BRL). Os impostos incidem sobre o <strong>valor declarado</strong> na
          alfândega (USD), que por padrão é o produto (ou produto + frete,
          conforme o método) mas pode ser editado livremente.
        </p>
        <pre className="bg-background text-foreground overflow-x-auto rounded-md border p-3">
{`kgExtra    = ceil(peso − pesoBase)        // ou proporcional no modo linear
freteCNY   = precoBase + precoPorKgExtra × kgExtra
mercadorias= (produto + frete) × câmbio(CNY→BRL)
declarado  = valor informado, ou padrão (produto[+frete]) convertido p/ USD
imposto    = baseTributável(USD) × câmbio(USD→BRL) × imposto%   // isenção: só o que passa de US$50
ICMS       = (declaradoBRL + imposto) × ICMS%
final      = (mercadorias + imposto + ICMS) × (1 + margem%)`}
        </pre>
      </CardContent>
    </Card>
  );
}
