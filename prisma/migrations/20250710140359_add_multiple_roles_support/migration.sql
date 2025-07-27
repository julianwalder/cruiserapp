/*
  Warnings:

  - The values [AIRSTRIP] on the enum `AirfieldType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `email` on the `airfields` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `airfields` table. All the data in the column will be lost.
  - You are about to drop the column `runwayLength` on the `airfields` table. All the data in the column will be lost.
  - You are about to drop the column `runwaySurface` on the `airfields` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `airfields` table. All the data in the column will be lost.
  - The `latitude` column on the `airfields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `longitude` column on the `airfields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `elevation` column on the `airfields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AirfieldType_new" AS ENUM ('AIRPORT', 'HELIPORT', 'SEAPLANE_BASE', 'BALLOON_PORT', 'GLIDER_PORT', 'ULTRALIGHT_FIELD');
ALTER TABLE "airfields" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "airfields" ALTER COLUMN "type" TYPE "AirfieldType_new" USING ("type"::text::"AirfieldType_new");
ALTER TYPE "AirfieldType" RENAME TO "AirfieldType_old";
ALTER TYPE "AirfieldType_new" RENAME TO "AirfieldType";
DROP TYPE "AirfieldType_old";
COMMIT;

-- AlterTable
ALTER TABLE "airfields" DROP COLUMN "email",
DROP COLUMN "phone",
DROP COLUMN "runwayLength",
DROP COLUMN "runwaySurface",
DROP COLUMN "website",
ADD COLUMN     "continent" TEXT,
ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
DROP COLUMN "latitude",
ADD COLUMN     "latitude" DOUBLE PRECISION,
DROP COLUMN "longitude",
ADD COLUMN     "longitude" DOUBLE PRECISION,
DROP COLUMN "elevation",
ADD COLUMN     "elevation" INTEGER;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "totalFlightHours" SET DEFAULT 0,
ALTER COLUMN "totalFlightHours" SET DATA TYPE DOUBLE PRECISION;

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
