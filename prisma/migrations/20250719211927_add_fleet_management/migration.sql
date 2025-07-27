-- CreateEnum
CREATE TYPE "AircraftStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AircraftType" AS ENUM ('SINGLE_ENGINE', 'MULTI_ENGINE', 'HELICOPTER', 'GLIDER', 'ULTRALIGHT', 'SEAPLANE');

-- CreateTable
CREATE TABLE "aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "type" "AircraftType" NOT NULL,
    "model" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "yearOfManufacture" INTEGER,
    "totalFlightHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "status" "AircraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseAirfieldId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "insuranceExpiry" TIMESTAMP(3),
    "registrationExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_management" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "assignedPilotId" TEXT,
    "maintenanceSchedule" TEXT,
    "operationalHours" TEXT,
    "fuelType" TEXT,
    "fuelCapacity" DOUBLE PRECISION,
    "range" DOUBLE PRECISION,
    "maxPassengers" INTEGER,
    "maxPayload" DOUBLE PRECISION,
    "specialEquipment" TEXT[],
    "operationalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_management_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_registration_key" ON "aircraft"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_management_aircraftId_key" ON "fleet_management"("aircraftId");

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_baseAirfieldId_fkey" FOREIGN KEY ("baseAirfieldId") REFERENCES "airfields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_management" ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_management" ADD CONSTRAINT "fleet_management_assignedPilotId_fkey" FOREIGN KEY ("assignedPilotId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
