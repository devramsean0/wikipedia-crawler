/*
  Warnings:

  - You are about to drop the column `domainId` on the `unscrapedPage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "unscrapedPage" DROP CONSTRAINT "unscrapedPage_domainId_fkey";

-- AlterTable
ALTER TABLE "unscrapedPage" DROP COLUMN "domainId";
