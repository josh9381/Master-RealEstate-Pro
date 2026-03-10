-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "bounceReason" TEXT,
ADD COLUMN     "bounceType" TEXT,
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "lastRetryAt" TIMESTAMP(3),
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spamComplaintAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_bouncedAt_idx" ON "Message"("bouncedAt");

-- CreateIndex
CREATE INDEX "Message_bounceType_idx" ON "Message"("bounceType");

-- CreateIndex
CREATE INDEX "Message_spamComplaintAt_idx" ON "Message"("spamComplaintAt");
