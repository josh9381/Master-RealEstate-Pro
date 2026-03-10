/*
  Warnings:

  - A unique constraint covering the columns `[unsubscribeToken]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailOptOutAt" TIMESTAMP(3),
ADD COLUMN     "emailOptOutReason" TEXT,
ADD COLUMN     "unsubscribeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_unsubscribeToken_key" ON "Lead"("unsubscribeToken");
