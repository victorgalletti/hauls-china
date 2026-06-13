-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShippingMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseWeightKg" REAL NOT NULL,
    "basePriceCny" REAL NOT NULL,
    "extraPricePerKgCny" REAL NOT NULL,
    "roundingMode" TEXT NOT NULL DEFAULT 'ceil',
    "minWeightKg" REAL NOT NULL DEFAULT 0,
    "maxWeightKg" REAL NOT NULL,
    "etaDays" TEXT,
    "declaredIncludesFreight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingMethod" ("basePriceCny", "baseWeightKg", "createdAt", "etaDays", "extraPricePerKgCny", "id", "maxWeightKg", "minWeightKg", "name", "roundingMode", "updatedAt") SELECT "basePriceCny", "baseWeightKg", "createdAt", "etaDays", "extraPricePerKgCny", "id", "maxWeightKg", "minWeightKg", "name", "roundingMode", "updatedAt" FROM "ShippingMethod";
DROP TABLE "ShippingMethod";
ALTER TABLE "new_ShippingMethod" RENAME TO "ShippingMethod";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
