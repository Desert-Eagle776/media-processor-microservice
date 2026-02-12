/*
  Warnings:

  - Added the required column `originalKey` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "optimizedKey" TEXT,
ADD COLUMN     "originalKey" TEXT NOT NULL;
