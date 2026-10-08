-- CreateTable
CREATE TABLE "ActivityPrice" (
    "activityType" "ActivityType" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityPrice_pkey" PRIMARY KEY ("activityType")
);

-- CreateTable
CREATE TABLE "EquipmentPrice" (
    "key" TEXT NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentPrice_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FunDiveTier" (
    "minDives" INTEGER NOT NULL,
    "tourist" DECIMAL(8,2) NOT NULL,
    "local" DECIMAL(8,2) NOT NULL,
    "recurrent" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunDiveTier_pkey" PRIMARY KEY ("minDives")
);


-- The prices that were in config/prices.ts.
INSERT INTO "ActivityPrice" ("activityType", "price", "updatedAt") VALUES
    ('SNORKELING', 25, CURRENT_TIMESTAMP),
    ('DISCOVER_SCUBA', 60, CURRENT_TIMESTAMP),
    ('FUN_DIVE', 45, CURRENT_TIMESTAMP),
    ('OW_CERT', 350, CURRENT_TIMESTAMP),
    ('AOW_CERT', 280, CURRENT_TIMESTAMP),
    ('RESCUE_CERT', 320, CURRENT_TIMESTAMP);

INSERT INTO "EquipmentPrice" ("key", "price", "updatedAt") VALUES
    ('wetsuit', 8, CURRENT_TIMESTAMP),
    ('bcd', 10, CURRENT_TIMESTAMP),
    ('regulator', 10, CURRENT_TIMESTAMP),
    ('maskFins', 5, CURRENT_TIMESTAMP),
    ('diveComputer', 12, CURRENT_TIMESTAMP),
    ('fullPackage', 35, CURRENT_TIMESTAMP);

-- Locals and recurrent customers had a flat rate at every tier.
INSERT INTO "FunDiveTier" ("minDives", "tourist", "local", "recurrent", "updatedAt") VALUES
    (1, 46, 35, 32, CURRENT_TIMESTAMP),
    (3, 44, 35, 32, CURRENT_TIMESTAMP),
    (6, 42, 35, 32, CURRENT_TIMESTAMP),
    (9, 40, 35, 32, CURRENT_TIMESTAMP),
    (13, 38, 35, 32, CURRENT_TIMESTAMP);
