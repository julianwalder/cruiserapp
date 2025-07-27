-- CreateEnum
CREATE TYPE "FlightType" AS ENUM ('TRAINING', 'CHARTER', 'PERSONAL', 'MAINTENANCE', 'OTHER');

-- CreateTable
CREATE TABLE "flight_logs" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "instructorId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureAirfieldId" TEXT NOT NULL,
    "arrivalAirfieldId" TEXT NOT NULL,
    "flightType" "FlightType" NOT NULL,
    "purpose" TEXT NOT NULL,
    "remarks" TEXT,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "flight_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_departureAirfieldId_fkey" FOREIGN KEY ("departureAirfieldId") REFERENCES "airfields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_arrivalAirfieldId_fkey" FOREIGN KEY ("arrivalAirfieldId") REFERENCES "airfields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
