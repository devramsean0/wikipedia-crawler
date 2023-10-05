/*
  Warnings:

  - Added the required column `sleepDuration` to the `domain` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "domain" ADD COLUMN     "sleepDuration" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "page" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'No Title';
