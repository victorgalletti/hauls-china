"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Loader2,
  ImagePlus,
  Save,
  ExternalLink,
} from "lucide-react";
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
import type { ShippingMethodDTO } from "@/lib/shipping";
import {
  uploadImage,
  createPurchase,
  updatePurchase,
  type PurchaseDTO,
} from "@/app/purchases/actions";

type WeightUnit = "g" | "kg";

// Manual rate defaults (¥ per R$ and R$ per US$) — editable; the user pays a
// worse-than-market rate so there is no automatic quote.
const DEFAULT_CNY_PER_BRL = "1.23";
const DEFAULT_USD_BRL = "5.40";

type ItemState = {
  id: string;
  name: string;
  category: string;
  person: string;
  weight: string;
  price: string;
  link: string;
  /** Per-item "¥ por R$" override; "" = use the package rate. */
  cnyPerBrl: string;
  imageUrl: string | null;
  uploading: boolean;
  applyMargin: boolean;
  /** Per-item margin % override; "" = use the package margin. */
  marginPct: string;
};

function toNum(v: string): number {
  if (v.trim() === "") return 0;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** "¥ per R$" → internal "R$ per ¥". */
function cnyToBrlFromPerBrl(cnyPerBrl: number): number {
  return cnyPerBrl > 0 ? 1 / cnyPerBrl : 0;
}

/** internal "R$ per ¥" → "¥ per R$" for display/editing. */
function perBrlFromCnyToBrl(cnyToBrl: number | null | undefined): string {
  return cnyToBrl && cnyToBrl > 0 ? String(1 / cnyToBrl) : "";
}

function newItem(): ItemState {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    person: "",
    weight: "",
    price: "",
    link: "",
    cnyPerBrl: "",
    imageUrl: null,
    uploading: false,
    applyMargin: true,
    marginPct: "",
  };
}

export function PurchaseBuilder({
  methods,
  purchase,
}: {
  methods: ShippingMethodDTO[];
  purchase?: PurchaseDTO;
}) {
  const router = useRouter();
  const editing = !!purchase;
  const [name, setName] = useState(purchase?.name ?? "");
  const [methodId, setMethodId] = useState(
    () =>
      (purchase && methods.find((m) => m.name === purchase.methodName)?.id) ||
      methods[0]?.id ||
      "",
  );
  // Stored item weights are in kg, so edit mode shows kg.
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    purchase ? "kg" : "g",
  );
  // Package yuan rate as "¥ por R$" (derived from the stored R$/¥ when editing).
  const [cnyPerBrl, setCnyPerBrl] = useState(
    purchase ? perBrlFromCnyToBrl(purchase.cnyToBrl) : DEFAULT_CNY_PER_BRL,
  );
  const [usdToBrl, setUsdToBrl] = useState(
    purchase ? String(purchase.usdToBrl) : DEFAULT_USD_BRL,
  );
  const [insuranceCny, setInsuranceCny] = useState(
    String(purchase?.insuranceCny ?? 0),
  );
  const [importTaxPct, setImportTaxPct] = useState(
    String(purchase?.importTaxPct ?? 60),
  );
  const [icmsPct, setIcmsPct] = useState(String(purchase?.icmsPct ?? 17));
  const [marginPct, setMarginPct] = useState(String(purchase?.marginPct ?? 0));
  const [exemptionEnabled, setExemptionEnabled] = useState(
    purchase?.exemptionEnabled ?? false,
  );
  const [declaredUsd, setDeclaredUsd] = useState(
    purchase?.declaredValueUsd != null ? String(purchase.declaredValueUsd) : "",
  );
  const [items, setItems] = useState<ItemState[]>(() =>
    purchase && purchase.items.length
      ? purchase.items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category ?? "",
          person: i.person ?? "",
          weight: String(i.weightKg),
          price: String(i.priceCny),
          link: i.link ?? "",
          cnyPerBrl: perBrlFromCnyToBrl(i.cnyToBrl),
          imageUrl: i.imageUrl ?? null,
          uploading: false,
          applyMargin: i.applyMargin,
          marginPct: i.marginPct != null ? String(i.marginPct) : "",
        }))
      : [newItem()],
  );
  const [saving, startSaving] = useTransition();

  const method = methods.find((m) => m.id === methodId) ?? null;
  const toKg = (w: string) => (weightUnit === "g" ? toNum(w) / 1000 : toNum(w));
  const packageCnyToBrl = cnyToBrlFromPerBrl(toNum(cnyPerBrl));

  const packageItems: PackageItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    person: i.person,
    weightKg: toKg(i.weight),
    priceCny: toNum(i.price),
    link: i.link,
    // Per-item override only when filled.
    cnyToBrl:
      i.cnyPerBrl.trim() === "" ? null : cnyToBrlFromPerBrl(toNum(i.cnyPerBrl)),
    imageUrl: i.imageUrl,
    applyMargin: i.applyMargin,
    marginPct: i.marginPct.trim() === "" ? null : toNum(i.marginPct),
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
          cnyToBrl: packageCnyToBrl,
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
      cnyPerBrl,
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
      const input = {
        name,
        methodName: method.name,
        baseWeightKg: method.baseWeightKg,
        basePriceCny: method.basePriceCny,
        extraPricePerKgCny: method.extraPricePerKgCny,
        roundingMode: method.roundingMode,
        declaredIncludesFreight: method.declaredIncludesFreight,
        cnyToBrl: packageCnyToBrl,
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
          link: i.link,
          cnyToBrl: i.cnyToBrl,
          imageUrl: i.imageUrl,
          applyMargin: i.applyMargin,
          marginPct: i.marginPct,
        })),
      };
      const res = editing
        ? await updatePurchase(purchase!.id, input)
        : await createPurchase(input);
      if (res.ok) {
        toast.success(editing ? "Compra atualizada" : "Compra salva");
        if (editing) {
          // Stay on the edit page; just resync server data (form state is kept).
          router.refresh();
        } else {
          router.push("/purchases");
        }
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {editing ? "Editar compra" : "Nova compra"}
        </h1>
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
                <Field
                  label="Yuan (¥ por R$)"
                  suffix="¥/R$"
                  value={cnyPerBrl}
                  onChange={setCnyPerBrl}
                  hint={`1 ¥ = ${formatBRL(packageCnyToBrl)}`}
                />
                <Field
                  label="Dólar (R$ por US$)"
                  value={usdToBrl}
                  onChange={setUsdToBrl}
                />
                <Field label="Seguro" suffix="CNY" value={insuranceCny} onChange={setInsuranceCny} />
                <Field label="Imposto imp." suffix="%" value={importTaxPct} onChange={setImportTaxPct} />
                <Field label="ICMS" suffix="%" value={icmsPct} onChange={setIcmsPct} />
                <Field label="Margem padrão" suffix="%" value={marginPct} onChange={setMarginPct} />
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
                    <div className="relative sm:col-span-2">
                      <Input
                        type="url"
                        placeholder="Link do produto (opcional)"
                        value={it.link}
                        onChange={(e) =>
                          updateItem(it.id, { link: e.target.value })
                        }
                        className={it.link.trim() ? "pr-9" : undefined}
                      />
                      {it.link.trim() ? (
                        <a
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir link do produto"
                          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : null}
                    </div>
                    <div className="relative sm:col-span-2">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Câmbio próprio do item — ¥ por R$ (opcional)"
                        value={it.cnyPerBrl}
                        onChange={(e) =>
                          updateItem(it.id, { cnyPerBrl: e.target.value })
                        }
                        className="pr-14"
                      />
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
                        ¥/R$
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-2">
                      <label className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Switch
                          checked={it.applyMargin}
                          onCheckedChange={(v) =>
                            updateItem(it.id, { applyMargin: v })
                          }
                        />
                        Aplicar margem (desligue p/ itens seus)
                      </label>
                      {it.applyMargin ? (
                        <div className="relative w-32">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder={`${formatNum(toNum(marginPct))} (compra)`}
                            value={it.marginPct}
                            onChange={(e) =>
                              updateItem(it.id, { marginPct: e.target.value })
                            }
                            className="h-8 pr-6 text-xs"
                          />
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs">
                            %
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover item"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length === 1}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
              {result.totalMarginBrl > 0 ? (
                <SummaryRow
                  label="Margem"
                  sub="soma por item"
                  value={formatBRL(result.totalMarginBrl)}
                />
              ) : null}
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
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span>
                        {p.person}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({p.itemCount} · {formatNum(p.weightKg)} kg)
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="font-medium tabular-nums">
                          {formatBRL(p.finalBrl)}
                        </span>
                        {p.marginBrl > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            custo {formatBRL(p.costBrl)} + margem{" "}
                            {formatBRL(p.marginBrl)}
                          </span>
                        ) : null}
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
            {editing ? "Salvar alterações" : "Salvar compra"}
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
                      ) : i.marginPct != null ? (
                        <Badge variant="outline" className="ml-2">
                          margem {formatNum(i.marginPct)}%
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
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
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
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
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePaste(e: React.ClipboardEvent) {
    const imgItem = Array.from(e.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith("image/"),
    );
    const file = imgItem?.getAsFile();
    if (file) {
      e.preventDefault();
      onPick(file);
    }
  }

  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1">
      {/* Focusable so a screenshot can be pasted with Ctrl+V. */}
      <div
        tabIndex={0}
        onPaste={handlePaste}
        title="Clique aqui e cole (Ctrl+V) um print, ou use 'arquivo'"
        className="bg-muted/40 hover:bg-muted focus-visible:ring-ring relative flex size-20 items-center justify-center overflow-hidden rounded-md border outline-none focus-visible:ring-2"
      >
        {uploading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : url ? (
          <Image src={url} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <ImagePlus className="text-muted-foreground size-5" />
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-muted-foreground hover:text-foreground text-[11px] underline"
      >
        arquivo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
