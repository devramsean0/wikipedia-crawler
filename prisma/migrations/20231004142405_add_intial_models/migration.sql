-- CreateTable
CREATE TABLE "domain" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "page" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "domainId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_id_key" ON "domain"("id");

-- CreateIndex
CREATE UNIQUE INDEX "domain_name_key" ON "domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "page_id_key" ON "page"("id");

-- CreateIndex
CREATE UNIQUE INDEX "page_url_key" ON "page"("url");

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
