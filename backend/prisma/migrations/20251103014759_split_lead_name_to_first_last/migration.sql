-- Add firstName and lastName columns with temporary default values
ALTER TABLE "Lead" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

-- Split existing name data into firstName and lastName
UPDATE "Lead" 
SET 
  "firstName" = SPLIT_PART("name", ' ', 1),
  "lastName" = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY("name", ' '), 1) > 1 
    THEN SUBSTRING("name" FROM LENGTH(SPLIT_PART("name", ' ', 1)) + 2)
    ELSE ''
  END
WHERE "name" IS NOT NULL;

-- Drop the old name column
ALTER TABLE "Lead" DROP COLUMN "name";

-- Remove the default constraint now that data is migrated
ALTER TABLE "Lead" ALTER COLUMN "firstName" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "lastName" DROP DEFAULT;