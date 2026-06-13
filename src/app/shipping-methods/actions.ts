"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { shippingMethodSchema, type ShippingMethodDTO } from "@/lib/shipping";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function listShippingMethods(): Promise<ShippingMethodDTO[]> {
  const rows = await prisma.shippingMethod.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    baseWeightKg: r.baseWeightKg,
    basePriceCny: r.basePriceCny,
    extraPricePerKgCny: r.extraPricePerKgCny,
    roundingMode: r.roundingMode === "linear" ? "linear" : "ceil",
    minWeightKg: r.minWeightKg,
    maxWeightKg: r.maxWeightKg,
    etaDays: r.etaDays,
    declaredIncludesFreight: r.declaredIncludesFreight,
  }));
}

function revalidate() {
  revalidatePath("/shipping-methods");
  revalidatePath("/");
}

export async function createShippingMethod(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = shippingMethodSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  try {
    await prisma.shippingMethod.create({ data: parsed.data });
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível criar o método" };
  }
}

export async function updateShippingMethod(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = shippingMethodSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  try {
    await prisma.shippingMethod.update({ where: { id }, data: parsed.data });
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Método não encontrado para atualizar" };
  }
}

export async function deleteShippingMethod(id: string): Promise<ActionResult> {
  try {
    await prisma.shippingMethod.delete({ where: { id } });
  } catch {
    // Record already gone — treat as success so the UI stays consistent.
  }
  revalidate();
  return { ok: true };
}
