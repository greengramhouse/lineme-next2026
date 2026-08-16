-- CreateTable
CREATE TABLE "BotPersona" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "persona" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolInfo" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolInfo_topic_key" ON "SchoolInfo"("topic");

-- CreateIndex
CREATE INDEX "SchoolInfo_sortOrder_idx" ON "SchoolInfo"("sortOrder");
