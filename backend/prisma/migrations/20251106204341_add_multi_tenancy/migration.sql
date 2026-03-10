/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,email]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,name]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `EmailTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `SMSTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/

-- ========================================================================================
-- STEP 1: Create Organization table FIRST
-- ========================================================================================
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- ========================================================================================
-- STEP 2: Create a DEFAULT organization for existing data (migration helper)
-- ========================================================================================
INSERT INTO "Organization" ("id", "name", "slug", "subscriptionTier", "trialEndsAt", "isActive", "createdAt", "updatedAt")
VALUES (
  'clz0000000000000000000000',  -- Fixed ID for default org
  'Default Organization',
  'default-org',
  'ENTERPRISE',  -- Give existing data enterprise tier
  NULL,  -- No trial expiry
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ========================================================================================
-- STEP 3: Drop old unique constraints
-- ========================================================================================
DROP INDEX IF EXISTS "public"."Lead_email_key";
DROP INDEX IF EXISTS "public"."Tag_name_key";
DROP INDEX IF EXISTS "public"."User_email_key";

-- ========================================================================================
-- STEP 4: Add organizationId columns as NULLABLE first, then populate with default org
-- ========================================================================================

-- Activity
ALTER TABLE "Activity" ADD COLUMN "organizationId" TEXT;
UPDATE "Activity" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Activity" ALTER COLUMN "organizationId" SET NOT NULL;

-- Appointment
ALTER TABLE "Appointment" ADD COLUMN "organizationId" TEXT;
UPDATE "Appointment" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Appointment" ALTER COLUMN "organizationId" SET NOT NULL;

-- Campaign
ALTER TABLE "Campaign" ADD COLUMN "organizationId" TEXT;
UPDATE "Campaign" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Campaign" ALTER COLUMN "organizationId" SET NOT NULL;

-- EmailTemplate
ALTER TABLE "EmailTemplate" ADD COLUMN "organizationId" TEXT;
UPDATE "EmailTemplate" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "EmailTemplate" ALTER COLUMN "organizationId" SET NOT NULL;

-- Lead
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
UPDATE "Lead" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;

-- SMSTemplate
ALTER TABLE "SMSTemplate" ADD COLUMN "organizationId" TEXT;
UPDATE "SMSTemplate" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "SMSTemplate" ALTER COLUMN "organizationId" SET NOT NULL;

-- Tag
ALTER TABLE "Tag" ADD COLUMN "organizationId" TEXT;
UPDATE "Tag" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Tag" ALTER COLUMN "organizationId" SET NOT NULL;

-- User
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
UPDATE "User" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;

-- Workflow
ALTER TABLE "Workflow" ADD COLUMN "organizationId" TEXT;
UPDATE "Workflow" SET "organizationId" = 'clz0000000000000000000000' WHERE "organizationId" IS NULL;
ALTER TABLE "Workflow" ALTER COLUMN "organizationId" SET NOT NULL;

-- ========================================================================================
-- STEP 5: Create indexes
-- ========================================================================================

CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");

CREATE INDEX "Appointment_organizationId_idx" ON "Appointment"("organizationId");
CREATE INDEX "Appointment_organizationId_startTime_idx" ON "Appointment"("organizationId", "startTime");

CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");

CREATE INDEX "EmailTemplate_organizationId_idx" ON "EmailTemplate"("organizationId");
CREATE INDEX "EmailTemplate_organizationId_category_idx" ON "EmailTemplate"("organizationId", "category");

CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");
CREATE INDEX "Lead_organizationId_email_idx" ON "Lead"("organizationId", "email");
CREATE UNIQUE INDEX "Lead_organizationId_email_key" ON "Lead"("organizationId", "email");

CREATE INDEX "SMSTemplate_organizationId_idx" ON "SMSTemplate"("organizationId");
CREATE INDEX "SMSTemplate_organizationId_category_idx" ON "SMSTemplate"("organizationId", "category");

CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");
CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON "Tag"("organizationId", "name");

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

CREATE INDEX "Workflow_organizationId_idx" ON "Workflow"("organizationId");
CREATE INDEX "Workflow_organizationId_isActive_idx" ON "Workflow"("organizationId", "isActive");

-- ========================================================================================
-- STEP 6: Add foreign key constraints
-- ========================================================================================

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SMSTemplate" ADD CONSTRAINT "SMSTemplate_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;