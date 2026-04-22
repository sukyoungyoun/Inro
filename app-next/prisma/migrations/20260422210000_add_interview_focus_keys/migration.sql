-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "interviewFocusKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "UserProfile"
SET "interviewFocusKeys" = ARRAY["targetStage"::TEXT]
WHERE "targetStage" IS NOT NULL;
