-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "person" TEXT,
    "weightKg" REAL NOT NULL,
    "priceCny" REAL NOT NULL,
    "imageUrl" TEXT,
    "applyMargin" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseItem" ("category", "id", "imageUrl", "name", "person", "priceCny", "purchaseId", "weightKg") SELECT "category", "id", "imageUrl", "name", "person", "priceCny", "purchaseId", "weightKg" FROM "PurchaseItem";
DROP TABLE "PurchaseItem";
ALTER TABLE "new_PurchaseItem" RENAME TO "PurchaseItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
