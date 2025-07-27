/*
  Warnings:

  - You are about to drop the column `type` on the `aircraft` table. All the data in the column will be lost.
  - Added the required column `engineType` to the `aircraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `icaoTypeDesignator` to the `aircraft` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EngineType" AS ENUM ('PISTON', 'TURBOFAN', 'TURBOPROP', 'TURBOSHAFT', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "WakeTurbulenceCategory" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY', 'SUPER');

-- AlterTable
ALTER TABLE "aircraft" DROP COLUMN "type",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "engineCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "engineType" "EngineType" NOT NULL,
ADD COLUMN     "icaoTypeDesignator" TEXT NOT NULL,
ADD COLUMN     "wakeTurbulenceCategory" "WakeTurbulenceCategory" NOT NULL DEFAULT 'LIGHT';

-- DropEnum
DROP TYPE "AircraftType";
