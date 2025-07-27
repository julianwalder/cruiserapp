-- CreateTable
CREATE TABLE "base_management" (
    "id" TEXT NOT NULL,
    "airfieldId" TEXT NOT NULL,
    "baseManagerId" TEXT,
    "additionalInfo" TEXT,
    "facilities" TEXT[],
    "operatingHours" TEXT,
    "emergencyContact" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "base_management_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "base_management_airfieldId_key" ON "base_management"("airfieldId");

-- AddForeignKey
ALTER TABLE "base_management" ADD CONSTRAINT "base_management_airfieldId_fkey" FOREIGN KEY ("airfieldId") REFERENCES "airfields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "base_management" ADD CONSTRAINT "base_management_baseManagerId_fkey" FOREIGN KEY ("baseManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
