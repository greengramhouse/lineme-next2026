-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "webhookEventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("webhookEventId")
);

-- CreateIndex
CREATE INDEX "ProcessedEvent_processedAt_idx" ON "ProcessedEvent"("processedAt");
