-- CreateEnum
CREATE TYPE "AirfieldType" AS ENUM ('AIRPORT', 'AIRSTRIP', 'HELIPORT', 'SEAPLANE_BASE');

-- CreateEnum
CREATE TYPE "AirfieldStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED');

-- CreateTable
CREATE TABLE "airfields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AirfieldType" NOT NULL DEFAULT 'AIRPORT',
    "status" "AirfieldStatus" NOT NULL DEFAULT 'ACTIVE',
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "latitude" TEXT,
    "longitude" TEXT,
    "elevation" TEXT,
    "runwayLength" TEXT,
    "runwaySurface" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "airfields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airfields_code_key" ON "airfields"("code");

-- AddForeignKey
ALTER TABLE "airfields" ADD CONSTRAINT "airfields_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
