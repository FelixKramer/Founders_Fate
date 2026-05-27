-- M9: Decision DNA profile fields
-- Add DNA job tracking and report readiness fields to Profile.

-- DNA job ID (set when generation is triggered)
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dnaJobId" TEXT;

-- Timestamp when the DNA job was started
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dnaJobStartedAt" TIMESTAMP(3);

-- Whether the DNA report is ready to display
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dnaReportReady" BOOLEAN NOT NULL DEFAULT false;

-- Timestamp when the DNA report was completed
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dnaReportAt" TIMESTAMP(3);
