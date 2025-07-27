-- CreateTable
CREATE TABLE "icao_reference_type" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "typeDesignator" TEXT NOT NULL,
    "description" TEXT,
    "engineType" TEXT NOT NULL,
    "engineCount" INTEGER NOT NULL,
    "wtc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icao_reference_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "icao_reference_type_manufacturer_model_typeDesignator_key" ON "icao_reference_type"("manufacturer", "model", "typeDesignator");
