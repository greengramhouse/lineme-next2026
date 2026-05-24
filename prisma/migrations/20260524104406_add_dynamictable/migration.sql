-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'CONTAINS');

-- CreateTable
CREATE TABLE "AutoReply" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "matchType" "MatchType" NOT NULL DEFAULT 'EXACT',
    "payload" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoReply_keyword_key" ON "AutoReply"("keyword");

-- CreateIndex
CREATE INDEX "AutoReply_keyword_idx" ON "AutoReply"("keyword");
