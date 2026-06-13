import { z } from "zod";

export const ROUNDING_MODES = ["ceil", "linear"] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

/**
 * Validation schema for creating/editing a shipping method.
 * Numbers are coerced because HTML form inputs hand us strings.
 */
export const shippingMethodSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    baseWeightKg: z.coerce
      .number({ message: "Informe um número" })
      .positive("Deve ser maior que zero"),
    basePriceCny: z.coerce
      .number({ message: "Informe um número" })
      .positive("Deve ser maior que zero"),
    extraPricePerKgCny: z.coerce
      .number({ message: "Informe um número" })
      .nonnegative("Não pode ser negativo"),
    roundingMode: z.enum(ROUNDING_MODES),
    minWeightKg: z.coerce
      .number({ message: "Informe um número" })
      .nonnegative("Não pode ser negativo"),
    maxWeightKg: z.coerce
      .number({ message: "Informe um número" })
      .positive("Deve ser maior que zero"),
    etaDays: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    declaredIncludesFreight: z.boolean().default(false),
  })
  .refine((d) => d.minWeightKg <= d.baseWeightKg, {
    message: "Peso mínimo deve ser ≤ peso base",
    path: ["minWeightKg"],
  })
  .refine((d) => d.baseWeightKg <= d.maxWeightKg, {
    message: "Peso base deve ser ≤ peso máximo",
    path: ["maxWeightKg"],
  });

// Numeric fields are held as strings in the form (raw <input> values) and
// coerced to numbers by the schema on submit.
export type ShippingMethodInput = {
  name: string;
  baseWeightKg: string;
  basePriceCny: string;
  extraPricePerKgCny: string;
  roundingMode: RoundingMode;
  minWeightKg: string;
  maxWeightKg: string;
  etaDays: string;
  declaredIncludesFreight: boolean;
};

export type ShippingMethodValues = z.output<typeof shippingMethodSchema>;

/** Plain shape used across the UI (Prisma row serialized for the client). */
export type ShippingMethodDTO = {
  id: string;
  name: string;
  baseWeightKg: number;
  basePriceCny: number;
  extraPricePerKgCny: number;
  roundingMode: RoundingMode;
  minWeightKg: number;
  maxWeightKg: number;
  etaDays: string | null;
  declaredIncludesFreight: boolean;
};
