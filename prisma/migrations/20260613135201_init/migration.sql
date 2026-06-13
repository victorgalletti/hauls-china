-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseWeightKg" REAL NOT NULL,
    "basePriceCny" REAL NOT NULL,
    "extraPricePerKgCny" REAL NOT NULL,
    "roundingMode" TEXT NOT NULL DEFAULT 'ceil',
    "minWeightKg" REAL NOT NULL DEFAULT 0,
    "maxWeightKg" REAL NOT NULL,
    "etaDays" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
