"use server";

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { RoundingMode } from "@/lib/shipping";
import type { PackageItem } from "@/lib/purchase-calc";

export type PurchaseItemInput = {
  name: string;
  category?: string | null;
  person?: string | null;
  weightKg: number;
  priceCny: number;
  imageUrl?: string | null;
  applyMargin: boolean;
};

export type PurchaseInput = {
  name: string;
  methodName: string;
  baseWeightKg: number;
  basePriceCny: number;
  extraPricePerKgCny: number;
  roundingMode: RoundingMode;
  declaredIncludesFreight: boolean;
  cnyToBrl: number;
  usdToBrl: number;
  insuranceCny: number;
  importTaxPct: number;
  icmsPct: number;
  marginPct: number;
  exemptionEnabled: boolean;
  declaredValueUsd: number | null;
  items: PurchaseItemInput[];
};

export type PurchaseDTO = {
  id: string;
  name: string;
  methodName: string;
  baseWeightKg: number;
  basePriceCny: number;
  extraPricePerKgCny: number;
  roundingMode: RoundingMode;
  declaredIncludesFreight: boolean;
  cnyToBrl: number;
  usdToBrl: number;
  insuranceCny: number;
  importTaxPct: number;
  icmsPct: number;
  marginPct: number;
  exemptionEnabled: boolean;
  declaredValueUsd: number | null;
  createdAt: string;
  items: (PackageItem & { id: string })[];
};

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** Persist an uploaded image to public/uploads and return its public URL. */
export async function uploadImage(formData: FormData): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Arquivo inválido" };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Imagem muito grande (máx. 8MB)" };
  }
  const ext = path.extname(file.name).toLowerCase() || ".png";
  if (!ALLOWED.has(ext)) {
    return { ok: false, error: "Formato não suportado" };
  }
  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);
    return { ok: true, url: `/uploads/${filename}` };
  } catch {
    return { ok: false, error: "Falha ao salvar a imagem" };
  }
}

function toDTO(p: {
  id: string;
  name: string;
  methodName: string;
  baseWeightKg: number;
  basePriceCny: number;
  extraPricePerKgCny: number;
  roundingMode: string;
  declaredIncludesFreight: boolean;
  cnyToBrl: number;
  usdToBrl: number;
  insuranceCny: number;
  importTaxPct: number;
  icmsPct: number;
  marginPct: number;
  exemptionEnabled: boolean;
  declaredValueUsd: number | null;
  createdAt: Date;
  items: {
    id: string;
    name: string;
    category: string | null;
    person: string | null;
    weightKg: number;
    priceCny: number;
    imageUrl: string | null;
    applyMargin: boolean;
  }[];
}): PurchaseDTO {
  return {
    id: p.id,
    name: p.name,
    methodName: p.methodName,
    baseWeightKg: p.baseWeightKg,
    basePriceCny: p.basePriceCny,
    extraPricePerKgCny: p.extraPricePerKgCny,
    roundingMode: p.roundingMode === "linear" ? "linear" : "ceil",
    declaredIncludesFreight: p.declaredIncludesFreight,
    cnyToBrl: p.cnyToBrl,
    usdToBrl: p.usdToBrl,
    insuranceCny: p.insuranceCny,
    importTaxPct: p.importTaxPct,
    icmsPct: p.icmsPct,
    marginPct: p.marginPct,
    exemptionEnabled: p.exemptionEnabled,
    declaredValueUsd: p.declaredValueUsd,
    createdAt: p.createdAt.toISOString(),
    items: p.items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      person: i.person,
      weightKg: i.weightKg,
      priceCny: i.priceCny,
      imageUrl: i.imageUrl,
      applyMargin: i.applyMargin,
    })),
  };
}

export async function listPurchases(): Promise<PurchaseDTO[]> {
  const rows = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return rows.map(toDTO);
}

export async function createPurchase(input: PurchaseInput): Promise<ActionResult> {
  if (!input.name?.trim()) return { ok: false, error: "Dê um nome à compra" };
  if (!input.items?.length) return { ok: false, error: "Adicione ao menos um item" };
  try {
    const created = await prisma.purchase.create({
      data: {
        name: input.name.trim(),
        methodName: input.methodName,
        baseWeightKg: input.baseWeightKg,
        basePriceCny: input.basePriceCny,
        extraPricePerKgCny: input.extraPricePerKgCny,
        roundingMode: input.roundingMode,
        declaredIncludesFreight: input.declaredIncludesFreight,
        cnyToBrl: input.cnyToBrl,
        usdToBrl: input.usdToBrl,
        insuranceCny: input.insuranceCny,
        importTaxPct: input.importTaxPct,
        icmsPct: input.icmsPct,
        marginPct: input.marginPct,
        exemptionEnabled: input.exemptionEnabled,
        declaredValueUsd: input.declaredValueUsd,
        items: {
          create: input.items.map((i) => ({
            name: i.name.trim() || "Item",
            category: i.category?.trim() || null,
            person: i.person?.trim() || null,
            weightKg: i.weightKg,
            priceCny: i.priceCny,
            imageUrl: i.imageUrl || null,
            applyMargin: i.applyMargin,
          })),
        },
      },
    });
    revalidatePath("/purchases");
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "Não foi possível salvar a compra" };
  }
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  try {
    await prisma.purchase.delete({ where: { id } });
  } catch {
    // already gone — treat as success
  }
  revalidatePath("/purchases");
  return { ok: true };
}
