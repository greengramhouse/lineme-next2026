-- CreateTable
CREATE TABLE "RichMenu" (
    "id" TEXT NOT NULL,
    "richMenuId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RichMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RichMenu_richMenuId_key" ON "RichMenu"("richMenuId");

-- CreateIndex
CREATE INDEX "RichMenu_richMenuId_idx" ON "RichMenu"("richMenuId");
