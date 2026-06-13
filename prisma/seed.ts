import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const methods = [
  {
    name: "China Post SAL (0-10kg)",
    baseWeightKg: 1,
    basePriceCny: 217,
    extraPricePerKgCny: 75,
    roundingMode: "ceil",
    minWeightKg: 0,
    maxWeightKg: 10,
    etaDays: "20-60 dias",
    declaredIncludesFreight: false,
  },
  {
    name: "SH-SAL-BR (3-30kg)",
    baseWeightKg: 3,
    basePriceCny: 300,
    extraPricePerKgCny: 62.5,
    roundingMode: "ceil",
    minWeightKg: 3,
    maxWeightKg: 30,
    etaDays: "15-40 dias",
    declaredIncludesFreight: false,
  },
];

async function main() {
  for (const m of methods) {
    // Avoid duplicating seed rows on repeated runs.
    const existing = await prisma.shippingMethod.findFirst({
      where: { name: m.name },
    });
    if (existing) {
      await prisma.shippingMethod.update({ where: { id: existing.id }, data: m });
    } else {
      await prisma.shippingMethod.create({ data: m });
    }
  }
  console.log(`Seeded ${methods.length} shipping methods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
