/*
  Warnings:

  - The `status` column on the `Media` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "status",
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'PENDING';
