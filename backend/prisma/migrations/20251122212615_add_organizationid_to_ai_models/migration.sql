/*
  Warnings:

  - Added the required column `organizationId` to the `LeadScoringModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `UserAIPreferences` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable - Add organizationId columns (set from user's organizationId)
ALTER TABLE "LeadScoringModel" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "UserAIPreferences" ADD COLUMN "organizationId" TEXT;

-- Populate organizationId from the user's organizationId
UPDATE "LeadScoringModel" 
SET "organizationId" = (SELECT "organizationId" FROM "User" WHERE "User"."id" = "LeadScoringModel"."userId")
WHERE "organizationId" IS NULL;

UPDATE "UserAIPreferences" 
SET "organizationId" = (SELECT "organizationId" FROM "User" WHERE "User"."id" = "UserAIPreferences"."userId")
WHERE "organizationId" IS NULL;

-- Make organizationId NOT NULL after populating
ALTER TABLE "LeadScoringModel" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "UserAIPreferences" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "LeadScoringModel_organizationId_idx" ON "LeadScoringModel"("organizationId");

-- CreateIndex
CREATE INDEX "UserAIPreferences_organizationId_idx" ON "UserAIPreferences"("organizationId");

-- AddForeignKey
ALTER TABLE "LeadScoringModel" ADD CONSTRAINT "LeadScoringModel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAIPreferences" ADD CONSTRAINT "UserAIPreferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
