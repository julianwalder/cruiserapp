-- CreateTable
CREATE TABLE "airfield_backups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AirfieldStatus" NOT NULL DEFAULT 'ACTIVE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "elevation" INTEGER,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "continent" TEXT,
    "runwayLength" INTEGER,
    "runwaySurface" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "backupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airfield_backups_pkey" PRIMARY KEY ("id")
);
