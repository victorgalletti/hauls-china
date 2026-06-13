"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { calculatePackage } from "@/lib/purchase-calc";
import { formatBRL, formatNum } from "@/lib/format";
import { deletePurchase, type PurchaseDTO } from "@/app/purchases/actions";
import { cn } from "@/lib/utils";

export function PurchasesList({ purchases }: { purchases: PurchaseDTO[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-muted-foreground text-sm">
            Pacotes registrados, com a divisão por pessoa.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchases/new">
            <Plus className="size-4" /> Nova compra
          </Link>
        </Button>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
            <Package className="size-8 opacity-50" />
            Nenhuma compra registrada ainda.
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/purchases/new">Registrar a primeira</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {purchases.map((p) => (
            <PurchaseCard key={p.id} purchase={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PurchaseCard({ purchase: p }: { purchase: PurchaseDTO }) {
  const result = calculatePackage(
    {
      method: {
        baseWeightKg: p.baseWeightKg,
        basePriceCny: p.basePriceCny,
        extraPricePerKgCny: p.extraPricePerKgCny,
        roundingMode: p.roundingMode,
        declaredIncludesFreight: p.declaredIncludesFreight,
      },
      cnyToBrl: p.cnyToBrl,
      usdToBrl: p.usdToBrl,
      insuranceCny: p.insuranceCny,
      importTaxPct: p.importTaxPct,
      icmsPct: p.icmsPct,
      marginPct: p.marginPct,
      exemptionEnabled: p.exemptionEnabled,
      declaredValueUsd: p.declaredValueUsd,
    },
    p.items,
  );

  const thumbs = p.items.filter((i) => i.imageUrl).slice(0, 5);

  return (
    <Card className="relative">
      <DeleteButton
        id={p.id}
        name={p.name}
        className="absolute top-2 right-2 z-10"
      />
      <CardHeader>
        <Link href={`/purchases/${p.id}`} className="block pr-8">
          <CardTitle className="text-base hover:underline">{p.name}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {new Date(p.createdAt).toLocaleDateString("pt-BR")} · {p.methodName} ·{" "}
            {p.items.length} item(ns) · {formatNum(result.totalWeightKg)} kg
          </p>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {thumbs.length > 0 ? (
          <div className="flex gap-2">
            {thumbs.map((i) => (
              <div
                key={i.id}
                className="bg-muted relative size-12 overflow-hidden rounded-md border"
              >
                {i.imageUrl ? (
                  <Image
                    src={i.imageUrl}
                    alt={i.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1">
          {result.people.map((person) => (
            <div
              key={person.person}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-muted-foreground">
                {person.person}{" "}
                <span className="text-xs">({formatNum(person.weightKg)} kg)</span>
              </span>
              <span className="tabular-nums">{formatBRL(person.finalBrl)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-medium">Total</span>
          <Badge className="text-sm tabular-nums">
            {formatBRL(result.finalTotalBrl)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteButton({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    setPending(true);
    const res = await deletePurchase(id);
    if (res.ok) {
      toast.success("Compra excluída");
      setOpen(false);
    } else {
      toast.error("Erro ao excluir");
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir compra"
          className={cn(
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            className,
          )}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir compra</DialogTitle>
          <DialogDescription>
            Excluir <strong>{name}</strong>? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
