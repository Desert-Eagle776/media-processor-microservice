/*
  Warnings:

  - You are about to drop the column `thubmnailKey` on the `Media` table. All the data in the column will be lost.
  - Added the required column `thumbnailKey` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" DROP COLUMN "thubmnailKey",
ADD COLUMN     "thumbnailKey" TEXT NOT NULL;
