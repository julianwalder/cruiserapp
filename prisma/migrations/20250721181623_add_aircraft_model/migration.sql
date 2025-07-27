-- CreateTable
CREATE TABLE "aircraft" (
    "id" TEXT NOT NULL,
    "icaoReferenceTypeId" TEXT NOT NULL,
    "callSign" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "yearOfManufacture" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_callSign_key" ON "aircraft"("callSign");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_serialNumber_key" ON "aircraft"("serialNumber");

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_icaoReferenceTypeId_fkey" FOREIGN KEY ("icaoReferenceTypeId") REFERENCES "icao_reference_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
