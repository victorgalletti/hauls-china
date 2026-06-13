"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Loader2, ImagePlus, Save } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculatePackage, type PackageItem } from "@/lib/purchase-calc";
import { formatBRL, formatCNY, formatUSD, formatNum } from "@/lib/format";
import type { Rates } from "@/lib/rates";
import type { ShippingMethodDTO } from "@/lib/shipping";
import { uploadImage, createPurchase } from "@/app/purchases/actions";

type WeightUnit = "g" | "kg";

type ItemState = {
  id: string;
  name: string;
  category: string;
  person: string;
  weight: string;
  price: string;
  imageUrl: string | null;
  uploading: boolean;
  applyMargin: boolean;
};

function toNum(v: string): number {
  if (v.trim() === "") return 0;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function newItem(): ItemState {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    person: "",
    weight: "",
    price: "",
    imageUrl: null,
    uploading: false,
    applyMargin: true,
  };
}

export function PurchaseBuilder({
  methods,
  initialRates,
}: {
  methods: ShippingMethodDTO[];
  initialRates: Rates;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("g");
  const [cnyToBrl, setCnyToBrl] = useState(String(initialRates.cnyToBrl));
  const [usdToBrl, setUsdToBrl] = useState(String(initialRates.usdToBrl));
  const [insuranceCny, setInsuranceCny] = useState("0");
  const [importTaxPct, setImportTaxPct] = useState("60");
  const [icmsPct, setIcmsPct] = useState("17");
  const [marginPct, setMarginPct] = useState("0");
  const [exemptionEnabled, setExemptionEnabled] = useState(false);
  const [declaredUsd, setDeclaredUsd] = useState("");
  const [items, setItems] = useState<ItemState[]>([newItem()]);
  const [saving, startSaving] = useTransition();

  const method = methods.find((m) => m.id === methodId) ?? null;
  const toKg = (w: string) => (weightUnit === "g" ? toNum(w) / 1000 : toNum(w));

  const packageItems: PackageItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    person: i.person,
    weightKg: toKg(i.weight),
    priceCny: toNum(i.price),
    imageUrl: i.imageUrl,
    applyMargin: i.applyMargin,
  }));

  const result = useMemo(
    () =>
      calculatePackage(
        {
          method: method
            ? {
                baseWeightKg: method.baseWeightKg,
                basePriceCny: method.basePriceCny,
                extraPricePerKgCny: method.extraPricePerKgCny,
                roundingMode: method.roundingMode,
                declaredIncludesFreight: method.declaredIncludesFreight,
              }
            : null,
          cnyToBrl: toNum(cnyToBrl),
          usdToBrl: toNum(usdToBrl),
          insuranceCny: toNum(insuranceCny),
          importTaxPct: toNum(importTaxPct),
          icmsPct: toNum(icmsPct),
          marginPct: toNum(marginPct),
          exemptionEnabled,
          declaredValueUsd: declaredUsd.trim() === "" ? null : toNum(declaredUsd),
        },
        packageItems,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      methodId,
      cnyToBrl,
      usdToBrl,
      insuranceCny,
      importTaxPct,
      icmsPct,
      marginPct,
      exemptionEnabled,
      declaredUsd,
      items,
      weightUnit,
    ],
  );

  function updateItem(id: string, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function pickImage(id: string, file: File) {
    updateItem(id, { uploading: true });
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadImage(fd);
    if (res.ok) {
      updateItem(id, { imageUrl: res.url, uploading: false });
    } else {
      updateItem(id, { uploading: false });
      toast.error(res.error);
    }
  }

  function save() {
    if (!method) {
      toast.error("Selecione um método de envio");
      return;
    }
    startSaving(async () => {
      const res = await createPurchase({
        name,
        methodName: method.name,
        baseWeightKg: method.baseWeightKg,
        basePriceCny: method.basePriceCny,
        extraPricePerKgCny: method.extraPricePerKgCny,
        roundingMode: method.roundingMode,
        declaredIncludesFreight: method.declaredIncludesFreight,
        cnyToBrl: toNum(cnyToBrl),
        usdToBrl: toNum(usdToBrl),
        insuranceCny: toNum(insuranceCny),
        importTaxPct: toNum(importTaxPct),
        icmsPct: toNum(icmsPct),
        marginPct: toNum(marginPct),
        exemptionEnabled,
        declaredValueUsd: declaredUsd.trim() === "" ? null : toNum(declaredUsd),
        items: packageItems.map((i) => ({
          name: i.name || "Item",
          category: i.category,
          person: i.person,
          weightKg: i.weightKg,
          priceCny: i.priceCny,
          imageUrl: i.imageUrl,
          applyMargin: i.applyMargin,
        })),
      });
      if (res.ok) {
        toast.success("Compra salva");
        router.push("/purchases");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova compra</h1>
        <p className="text-muted-foreground text-sm">
          Monte um pacote com vários itens; o frete, seguro e impostos são
          divididos por peso (regra de três) entre os destinatários.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {/* Package params */}
          <Card>
            <CardHeader>
              <CardTitle>Pacote</CardTitle>
              <CardDescription>Parâmetros do envio e impostos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pname">Nome da compra</Label>
                <Input
                  id="pname"
                  placeholder="Ex.: 7 camisas - junho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pmethod">Método de envio</Label>
                  <Select value={methodId} onValueChange={setMethodId}>
                    <SelectTrigger id="pmethod" className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="punit">Unidade de peso dos itens</Label>
                  <Select
                    value={weightUnit}
                    onValueChange={(v) => setWeightUnit(v as WeightUnit)}
                  >
                    <SelectTrigger id="punit" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">gramas (g)</SelectItem>
                      <SelectItem value="kg">quilos (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Câmbio CNY→BRL" value={cnyToBrl} onChange={setCnyToBrl} />
                <Field label="Câmbio USD→BRL" value={usdToBrl} onChange={setUsdToBrl} />
                <Field label="Seguro" suffix="CNY" value={insuranceCny} onChange={setInsuranceCny} />
                <Field label="Imposto imp." suffix="%" value={importTaxPct} onChange={setImportTaxPct} />
                <Field label="ICMS" suffix="%" value={icmsPct} onChange={setIcmsPct} />
                <Field label="Margem" suffix="%" value={marginPct} onChange={setMarginPct} />
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pdeclared">Valor declarado (USD)</Label>
                  <Input
                    id="pdeclared"
                    type="number"
                    step="any"
                    min="0"
                    placeholder={formatNum(result.declaredDefaultUsd)}
                    value={declaredUsd}
                    onChange={(e) => setDeclaredUsd(e.target.value)}
                    className="w-40"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Switch
                    checked={exemptionEnabled}
                    onCheckedChange={setExemptionEnabled}
                  />
                  Remessa Conforme (isenção US$50)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Itens</CardTitle>
                <CardDescription>
                  {items.length} item(ns) · {formatNum(result.totalWeightKg)} kg no
                  total
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((p) => [...p, newItem()])}
              >
                <Plus className="size-4" /> Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row"
                >
                  <ImagePicker
                    url={it.imageUrl}
                    uploading={it.uploading}
                    onPick={(f) => pickImage(it.id, f)}
                  />
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Nome do produto"
                      value={it.name}
                      onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    />
                    <Input
                      placeholder="Categoria (ex.: roupas)"
                      value={it.category}
                      onChange={(e) =>
                        updateItem(it.id, { category: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Para quem (ex.: irmão)"
                      value={it.person}
                      onChange={(e) => updateItem(it.id, { person: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Peso"
                          value={it.weight}
                          onChange={(e) =>
                            updateItem(it.id, { weight: e.target.value })
                          }
                          className="pr-8"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs">
                          {weightUnit}
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Preço"
                          value={it.price}
                          onChange={(e) =>
                            updateItem(it.id, { price: e.target.value })
                          }
                          className="pr-10"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs">
                          CNY
                        </span>
                      </div>
                    </div>
                    <label className="text-muted-foreground flex items-center gap-2 text-xs sm:col-span-2">
                      <Switch
                        checked={it.applyMargin}
                        onCheckedChange={(v) =>
                          updateItem(it.id, { applyMargin: v })
                        }
                      />
                      Aplicar margem neste item (desligue para itens seus)
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover item"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-6 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do pacote</CardTitle>
              <CardDescription>Custos compartilhados (por peso)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <SummaryRow label="Produtos" value={formatBRL(result.goodsBrl)} />
              <SummaryRow
                label="Frete"
                sub={method ? formatCNY(result.freightCny) : undefined}
                value={formatBRL(result.freightBrl)}
              />
              {toNum(insuranceCny) > 0 ? (
                <SummaryRow label="Seguro" value={formatBRL(result.insuranceBrl)} />
              ) : null}
              <SummaryRow
                label="Imposto importação"
                value={formatBRL(result.importTaxBrl)}
              />
              <SummaryRow label="ICMS" value={formatBRL(result.icmsBrl)} />
              <Separator className="my-1" />
              <SummaryRow
                label="Total"
                value={formatBRL(result.finalTotalBrl)}
                emphasis
              />
              <p className="text-muted-foreground pt-1 text-xs">
                Declarado: {formatUSD(result.declaredValueUsd)} ≈{" "}
                {formatBRL(result.declaredValueBrl)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por pessoa</CardTitle>
              <CardDescription>Quanto cada um paga</CardDescription>
            </CardHeader>
            <CardContent>
              {result.people.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem itens.</p>
              ) : (
                <div className="space-y-1.5">
                  {result.people.map((p) => (
                    <div
                      key={p.person}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {p.person}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({p.itemCount} · {formatNum(p.weightKg)} kg)
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatBRL(p.finalBrl)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar compra
          </Button>
        </div>
      </div>

      {/* Per-item breakdown */}
      {items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Detalhe por item</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">% peso</TableHead>
                  <TableHead className="text-right">Produto</TableHead>
                  <TableHead className="text-right">Rateio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.name || <span className="text-muted-foreground">—</span>}
                      {i.category ? (
                        <Badge variant="secondary" className="ml-2">
                          {i.category}
                        </Badge>
                      ) : null}
                      {!i.applyMargin ? (
                        <Badge variant="outline" className="ml-2">
                          sem margem
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {i.person || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNum(i.weightKg)} kg
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNum(i.share * 100)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(i.productBrl)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(i.sharedBrl)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBRL(i.finalBrl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix ? (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({
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
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
        {sub ? (
          <span className="text-muted-foreground/70 ml-1 text-xs">{sub}</span>
        ) : null}
      </span>
      <span className={emphasis ? "text-lg font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

function ImagePicker({
  url,
  uploading,
  onPick,
}: {
  url: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label className="bg-muted/40 hover:bg-muted relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border">
      {uploading ? (
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      ) : url ? (
        <Image src={url} alt="" fill sizes="80px" className="object-cover" />
      ) : (
        <ImagePlus className="text-muted-foreground size-5" />
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
