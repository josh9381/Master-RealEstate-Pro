/*
  Warnings:

  - Added the required column `organizationId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column as nullable first
ALTER TABLE "Message" ADD COLUMN     "organizationId" TEXT;

-- Step 2: Update existing messages to use the organization from their lead
UPDATE "Message" 
SET "organizationId" = (
  SELECT "Lead"."organizationId" 
  FROM "Lead" 
  WHERE "Lead"."id" = "Message"."leadId"
)
WHERE "leadId" IS NOT NULL;

-- Step 3: For messages without leads, use the first organization
UPDATE "Message" 
SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1)
WHERE "organizationId" IS NULL;

-- Step 4: Make the column required
ALTER TABLE "Message" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Message_organizationId_idx" ON "Message"("organizationId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
