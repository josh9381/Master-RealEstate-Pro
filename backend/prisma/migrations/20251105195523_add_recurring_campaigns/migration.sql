-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "maxOccurrences" INTEGER,
ADD COLUMN     "nextSendAt" TIMESTAMP(3),
ADD COLUMN     "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recurringPattern" JSONB;

-- CreateIndex
CREATE INDEX "Campaign_nextSendAt_idx" ON "Campaign"("nextSendAt");

-- CreateIndex
CREATE INDEX "Campaign_isRecurring_nextSendAt_idx" ON "Campaign"("isRecurring", "nextSendAt");
