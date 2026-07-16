-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "defaultDriverId" INTEGER,
    CONSTRAINT "Car_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Car" ("capacity", "id", "name", "plate", "status", "type") SELECT "capacity", "id", "name", "plate", "status", "type" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
CREATE UNIQUE INDEX "Car_plate_key" ON "Car"("plate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
