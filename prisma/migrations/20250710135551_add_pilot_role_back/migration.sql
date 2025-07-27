/*
  Warnings:

  - The values [FLIGHT_INSTRUCTOR,BASE_MANAGER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `base_airfields` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[continent,countries,createdById]` on the table `operational_areas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PILOT';
COMMIT;

-- DropForeignKey
ALTER TABLE "base_airfields" DROP CONSTRAINT "base_airfields_createdById_fkey";

-- AlterTable
ALTER TABLE "airfields" ADD COLUMN     "isBase" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "base_airfields";

-- CreateIndex
CREATE UNIQUE INDEX "operational_areas_continent_countries_createdById_key" ON "operational_areas"("continent", "countries", "createdById");
