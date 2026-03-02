-- ============================================================
-- Phase 1: Data & Schema Integrity Migration
-- Prepares existing data for Prisma schema changes:
--   1. Creates new enum types
--   2. Converts TEXT columns to enum types (with data normalization)
--   3. Adds organizationId columns, backfills, makes NOT NULL
-- ============================================================

-- ========================================
-- 1. Create new enum types (idempotent)
-- ========================================

DO $$ BEGIN
  CREATE TYPE "AIInsightType" AS ENUM ('LEAD_FOLLOWUP', 'SCORING_ACCURACY', 'EMAIL_PERFORMANCE', 'PIPELINE_HEALTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AIInsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'VOICEMAIL', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('LEAD_ASSIGNED', 'LEAD_STATUS_CHANGED', 'CAMPAIGN_COMPLETED', 'TASK_DUE', 'TASK_ASSIGNED', 'MESSAGE_RECEIVED', 'SYSTEM', 'WORKFLOW', 'WORKFLOW_COMPLETED', 'REMINDER', 'INBOUND_EMAIL', 'INBOUND_SMS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BounceType" AS ENUM ('HARD', 'SOFT', 'COMPLAINT', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'SYNCED', 'CONNECTED', 'DISCONNECTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SegmentMatchType" AS ENUM ('ALL', 'ANY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignLeadStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'UNSUBSCRIBED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'BOOLEAN', 'TEXTAREA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add SENDING to CampaignStatus if missing
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'SENDING';


-- ========================================
-- 2. Convert TEXT columns to enum types
-- ========================================

-- Helper: check column type before converting (skip if already enum)

-- Notification.type: TEXT → NotificationType
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Notification' AND column_name = 'type' AND data_type = 'text'
  ) THEN
    -- Normalize: uppercase, map unknown values to SYSTEM
    UPDATE "Notification" SET "type" = UPPER("type");
    UPDATE "Notification" SET "type" = 'SYSTEM'
      WHERE "type" NOT IN ('LEAD_ASSIGNED', 'LEAD_STATUS_CHANGED', 'CAMPAIGN_COMPLETED',
        'TASK_DUE', 'TASK_ASSIGNED', 'MESSAGE_RECEIVED', 'SYSTEM', 'WORKFLOW',
        'WORKFLOW_COMPLETED', 'REMINDER', 'INBOUND_EMAIL', 'INBOUND_SMS');
    ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";
  END IF;
END $$;

-- Call.direction: TEXT → CallDirection
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Call' AND column_name = 'direction' AND data_type = 'text'
  ) THEN
    UPDATE "Call" SET "direction" = UPPER("direction");
    UPDATE "Call" SET "direction" = 'INBOUND'
      WHERE "direction" NOT IN ('INBOUND', 'OUTBOUND');
    ALTER TABLE "Call" ALTER COLUMN "direction" TYPE "CallDirection" USING "direction"::"CallDirection";
  END IF;
END $$;

-- Call.status: TEXT → CallStatus
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Call' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    -- Normalize hyphenated/lowercase values
    UPDATE "Call" SET "status" = UPPER(REPLACE("status", '-', '_'));
    UPDATE "Call" SET "status" = 'FAILED'
      WHERE "status" NOT IN ('RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED',
        'BUSY', 'NO_ANSWER', 'VOICEMAIL', 'CANCELLED');
    ALTER TABLE "Call" ALTER COLUMN "status" TYPE "CallStatus" USING "status"::"CallStatus";
  END IF;
END $$;

-- Integration.syncStatus: TEXT → IntegrationSyncStatus (nullable)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Integration' AND column_name = 'syncStatus' AND data_type = 'text'
  ) THEN
    UPDATE "Integration" SET "syncStatus" = UPPER("syncStatus") WHERE "syncStatus" IS NOT NULL;
    UPDATE "Integration" SET "syncStatus" = 'IDLE'
      WHERE "syncStatus" IS NOT NULL
      AND "syncStatus" NOT IN ('IDLE', 'SYNCING', 'SYNCED', 'CONNECTED', 'DISCONNECTED', 'FAILED');
    ALTER TABLE "Integration" ALTER COLUMN "syncStatus" TYPE "IntegrationSyncStatus" USING "syncStatus"::"IntegrationSyncStatus";
  END IF;
END $$;

-- Message.bounceType: TEXT → BounceType (nullable)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Message' AND column_name = 'bounceType' AND data_type = 'text'
  ) THEN
    UPDATE "Message" SET "bounceType" = UPPER("bounceType") WHERE "bounceType" IS NOT NULL;
    UPDATE "Message" SET "bounceType" = 'UNKNOWN'
      WHERE "bounceType" IS NOT NULL
      AND "bounceType" NOT IN ('HARD', 'SOFT', 'COMPLAINT', 'UNKNOWN');
    ALTER TABLE "Message" ALTER COLUMN "bounceType" TYPE "BounceType" USING "bounceType"::"BounceType";
  END IF;
END $$;

-- AIInsight.type: TEXT → AIInsightType
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AIInsight' AND column_name = 'type' AND data_type = 'text'
  ) THEN
    UPDATE "AIInsight" SET "type" = UPPER("type");
    UPDATE "AIInsight" SET "type" = 'LEAD_FOLLOWUP'
      WHERE "type" NOT IN ('LEAD_FOLLOWUP', 'SCORING_ACCURACY', 'EMAIL_PERFORMANCE', 'PIPELINE_HEALTH');
    ALTER TABLE "AIInsight" ALTER COLUMN "type" TYPE "AIInsightType" USING "type"::"AIInsightType";
  END IF;
END $$;

-- AIInsight.priority: TEXT → AIInsightPriority (has default MEDIUM)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AIInsight' AND column_name = 'priority' AND data_type = 'text'
  ) THEN
    UPDATE "AIInsight" SET "priority" = UPPER("priority");
    UPDATE "AIInsight" SET "priority" = 'MEDIUM'
      WHERE "priority" NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    -- Must drop text default before converting to enum type
    ALTER TABLE "AIInsight" ALTER COLUMN "priority" DROP DEFAULT;
    ALTER TABLE "AIInsight" ALTER COLUMN "priority" TYPE "AIInsightPriority" USING "priority"::"AIInsightPriority";
    ALTER TABLE "AIInsight" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM'::"AIInsightPriority";
  END IF;
END $$;


-- ========================================
-- 3. Add organizationId columns & backfill
-- ========================================

-- Get a fallback org ID for any orphaned records
DO $$ DECLARE fallback_org TEXT;
BEGIN
  SELECT "id" INTO fallback_org FROM "Organization" LIMIT 1;

  -- Note: backfill from Lead.organizationId, fallback to author's org
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Note' AND column_name = 'organizationId') THEN
    ALTER TABLE "Note" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "Note" n SET "organizationId" = l."organizationId"
    FROM "Lead" l WHERE n."leadId" = l."id" AND n."organizationId" IS NULL;
  UPDATE "Note" n SET "organizationId" = u."organizationId"
    FROM "User" u WHERE n."authorId" = u."id" AND n."organizationId" IS NULL;
  UPDATE "Note" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "Note" ALTER COLUMN "organizationId" SET NOT NULL;

  -- BusinessSettings: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BusinessSettings' AND column_name = 'organizationId') THEN
    ALTER TABLE "BusinessSettings" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "BusinessSettings" bs SET "organizationId" = u."organizationId"
    FROM "User" u WHERE bs."userId" = u."id" AND bs."organizationId" IS NULL;
  UPDATE "BusinessSettings" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "BusinessSettings" ALTER COLUMN "organizationId" SET NOT NULL;

  -- EmailConfig: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EmailConfig' AND column_name = 'organizationId') THEN
    ALTER TABLE "EmailConfig" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "EmailConfig" ec SET "organizationId" = u."organizationId"
    FROM "User" u WHERE ec."userId" = u."id" AND ec."organizationId" IS NULL;
  UPDATE "EmailConfig" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "EmailConfig" ALTER COLUMN "organizationId" SET NOT NULL;

  -- SMSConfig: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SMSConfig' AND column_name = 'organizationId') THEN
    ALTER TABLE "SMSConfig" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "SMSConfig" sc SET "organizationId" = u."organizationId"
    FROM "User" u WHERE sc."userId" = u."id" AND sc."organizationId" IS NULL;
  UPDATE "SMSConfig" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "SMSConfig" ALTER COLUMN "organizationId" SET NOT NULL;

  -- NotificationSettings: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'NotificationSettings' AND column_name = 'organizationId') THEN
    ALTER TABLE "NotificationSettings" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "NotificationSettings" ns SET "organizationId" = u."organizationId"
    FROM "User" u WHERE ns."userId" = u."id" AND ns."organizationId" IS NULL;
  UPDATE "NotificationSettings" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "NotificationSettings" ALTER COLUMN "organizationId" SET NOT NULL;

  -- ABTestResult: backfill from ABTest or Campaign
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ABTestResult' AND column_name = 'organizationId') THEN
    ALTER TABLE "ABTestResult" ADD COLUMN "organizationId" TEXT;
  END IF;
  -- Try ABTest first (testId is required)
  UPDATE "ABTestResult" abr SET "organizationId" = abt."organizationId"
    FROM "ABTest" abt WHERE abr."testId" = abt."id" AND abr."organizationId" IS NULL;
  -- Then try Campaign
  UPDATE "ABTestResult" abr SET "organizationId" = c."organizationId"
    FROM "Campaign" c WHERE abr."campaignId" = c."id" AND abr."organizationId" IS NULL;
  UPDATE "ABTestResult" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "ABTestResult" ALTER COLUMN "organizationId" SET NOT NULL;

  -- Integration: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Integration' AND column_name = 'organizationId') THEN
    ALTER TABLE "Integration" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "Integration" i SET "organizationId" = u."organizationId"
    FROM "User" u WHERE i."userId" = u."id" AND i."organizationId" IS NULL;
  UPDATE "Integration" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "Integration" ALTER COLUMN "organizationId" SET NOT NULL;

  -- APIKeyAudit: backfill from User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'APIKeyAudit' AND column_name = 'organizationId') THEN
    ALTER TABLE "APIKeyAudit" ADD COLUMN "organizationId" TEXT;
  END IF;
  UPDATE "APIKeyAudit" a SET "organizationId" = u."organizationId"
    FROM "User" u WHERE a."userId" = u."id" AND a."organizationId" IS NULL;
  UPDATE "APIKeyAudit" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
  ALTER TABLE "APIKeyAudit" ALTER COLUMN "organizationId" SET NOT NULL;

  -- PasswordResetToken: backfill from User (table may not exist yet)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PasswordResetToken') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PasswordResetToken' AND column_name = 'organizationId') THEN
      ALTER TABLE "PasswordResetToken" ADD COLUMN "organizationId" TEXT;
    END IF;
    UPDATE "PasswordResetToken" prt SET "organizationId" = u."organizationId"
      FROM "User" u WHERE prt."userId" = u."id" AND prt."organizationId" IS NULL;
    UPDATE "PasswordResetToken" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;
    ALTER TABLE "PasswordResetToken" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;

END $$;

-- Done! Now run `prisma db push` to apply indexes, constraints, and create any new tables.
