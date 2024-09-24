-- CreateTable
CREATE TABLE "unscrapedPage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "domainId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "unscrapedPage_id_key" ON "unscrapedPage"("id");

-- AddForeignKey
ALTER TABLE "unscrapedPage" ADD CONSTRAINT "unscrapedPage_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
