-- CreateTable
CREATE TABLE "ChatHistory" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatHistory_lineId_createdAt_idx" ON "ChatHistory"("lineId", "createdAt");
