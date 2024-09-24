/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `unscrapedPage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "unscrapedPage_url_key" ON "unscrapedPage"("url");
