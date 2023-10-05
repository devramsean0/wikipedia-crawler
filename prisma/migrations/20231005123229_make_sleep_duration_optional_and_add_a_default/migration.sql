-- AlterTable
ALTER TABLE "domain" ALTER COLUMN "sleepDuration" DROP NOT NULL,
ALTER COLUMN "sleepDuration" SET DEFAULT 1000;
