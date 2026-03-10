-- CreateEnum
CREATE TYPE "ABTestType" AS ENUM ('EMAIL_SUBJECT', 'EMAIL_CONTENT', 'EMAIL_TIMING', 'SMS_CONTENT', 'LANDING_PAGE');

-- CreateEnum
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ABTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ABTestType" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "variantA" JSONB NOT NULL,
    "variantB" JSONB NOT NULL,
    "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ABTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABTestResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "leadId" TEXT,
    "campaignId" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ABTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ABTest_organizationId_idx" ON "ABTest"("organizationId");

-- CreateIndex
CREATE INDEX "ABTest_status_idx" ON "ABTest"("status");

-- CreateIndex
CREATE INDEX "ABTest_createdBy_idx" ON "ABTest"("createdBy");

-- CreateIndex
CREATE INDEX "ABTest_startDate_idx" ON "ABTest"("startDate");

-- CreateIndex
CREATE INDEX "ABTestResult_testId_idx" ON "ABTestResult"("testId");

-- CreateIndex
CREATE INDEX "ABTestResult_variant_idx" ON "ABTestResult"("variant");

-- CreateIndex
CREATE INDEX "ABTestResult_leadId_idx" ON "ABTestResult"("leadId");

-- CreateIndex
CREATE INDEX "ABTestResult_campaignId_idx" ON "ABTestResult"("campaignId");

-- CreateIndex
CREATE INDEX "ABTestResult_converted_idx" ON "ABTestResult"("converted");

-- AddForeignKey
ALTER TABLE "ABTest" ADD CONSTRAINT "ABTest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTest" ADD CONSTRAINT "ABTest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTestResult" ADD CONSTRAINT "ABTestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ABTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTestResult" ADD CONSTRAINT "ABTestResult_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTestResult" ADD CONSTRAINT "ABTestResult_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
