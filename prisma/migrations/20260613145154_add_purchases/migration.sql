-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "baseWeightKg" REAL NOT NULL,
    "basePriceCny" REAL NOT NULL,
    "extraPricePerKgCny" REAL NOT NULL,
    "roundingMode" TEXT NOT NULL DEFAULT 'ceil',
    "declaredIncludesFreight" BOOLEAN NOT NULL DEFAULT false,
    "cnyToBrl" REAL NOT NULL,
    "usdToBrl" REAL NOT NULL,
    "insuranceCny" REAL NOT NULL DEFAULT 0,
    "importTaxPct" REAL NOT NULL DEFAULT 60,
    "icmsPct" REAL NOT NULL DEFAULT 17,
    "marginPct" REAL NOT NULL DEFAULT 0,
    "exemptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "declaredValueUsd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "person" TEXT,
    "weightKg" REAL NOT NULL,
    "priceCny" REAL NOT NULL,
    "imageUrl" TEXT,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
