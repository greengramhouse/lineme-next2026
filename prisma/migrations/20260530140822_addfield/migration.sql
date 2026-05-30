/*
  Warnings:

  - A unique constraint covering the columns `[aliasId]` on the table `RichMenu` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RichMenu" ADD COLUMN     "aliasId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RichMenu_aliasId_key" ON "RichMenu"("aliasId");
