-- CreateTable
CREATE TABLE "operational_areas" (
    "id" TEXT NOT NULL,
    "continent" TEXT NOT NULL,
    "countries" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "operational_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_airfields" (
    "id" TEXT NOT NULL,
    "airfieldId" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "base_airfields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "base_airfields_airfieldId_key" ON "base_airfields"("airfieldId");

-- AddForeignKey
ALTER TABLE "operational_areas" ADD CONSTRAINT "operational_areas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "base_airfields" ADD CONSTRAINT "base_airfields_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
