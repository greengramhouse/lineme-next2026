-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "registeredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RegisterSession" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "linkToken" TEXT NOT NULL,
    "nonce" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fullName" TEXT,
    "phone" TEXT,
    "birthday" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisterSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisterSession_nonce_key" ON "RegisterSession"("nonce");

-- CreateIndex
CREATE INDEX "RegisterSession_lineId_idx" ON "RegisterSession"("lineId");

-- CreateIndex
CREATE INDEX "RegisterSession_expiresAt_idx" ON "RegisterSession"("expiresAt");
