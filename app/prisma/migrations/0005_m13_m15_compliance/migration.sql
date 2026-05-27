-- M13 + M15: Compliance, Security & Privacy + Lifecycle Jobs
-- Adds CCPA opt-out flag and re-engagement email tracking to Profile.
-- Adds soft-delete column to SimulationRecord for lifecycle cleanup cron.

-- Profile: CCPA "Do Not Sell or Share" opt-out preference
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ccpaOptOut" BOOLEAN NOT NULL DEFAULT false;

-- Profile: track when re-engagement email was sent (prevents duplicate sends)
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "reEngagementEmailSentAt" TIMESTAMP(3);

-- SimulationRecord: soft-delete timestamp for lifecycle cleanup
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Index on deletedAt to make cleanup queries fast
CREATE INDEX IF NOT EXISTS "SimulationRecord_deletedAt_idx" ON "SimulationRecord"("deletedAt");
