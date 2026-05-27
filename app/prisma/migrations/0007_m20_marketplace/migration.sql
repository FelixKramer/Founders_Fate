-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'removed');

-- CreateTable
CREATE TABLE "MarketplaceScenario" (
    "id" TEXT NOT NULL,
    "customModelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "archetypes" TEXT[],
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'pending_review',
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "scenarioJson" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceScenario_customModelId_key" ON "MarketplaceScenario"("customModelId");
CREATE INDEX "MarketplaceScenario_status_publishedAt_idx" ON "MarketplaceScenario"("status", "publishedAt");
CREATE INDEX "MarketplaceScenario_authorId_idx" ON "MarketplaceScenario"("authorId");
CREATE INDEX "MarketplaceScenario_category_idx" ON "MarketplaceScenario"("category");

-- AddForeignKey
ALTER TABLE "MarketplaceScenario" ADD CONSTRAINT "MarketplaceScenario_customModelId_fkey"
    FOREIGN KEY ("customModelId") REFERENCES "CustomModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceScenario" ADD CONSTRAINT "MarketplaceScenario_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
