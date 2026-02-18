/*
  Warnings:

  - Added the required column `thubmnailKey` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "thubmnailKey" TEXT NOT NULL,
ADD COLUMN     "transform" JSONB;
