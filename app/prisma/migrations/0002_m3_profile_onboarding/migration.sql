-- M3: Profile onboarding fields, privacy settings, and SimulationRecord baseline staleness

-- Profile: make archetype and cognitiveBaseline nullable (they're set during onboarding now)
ALTER TABLE "Profile" ALTER COLUMN "archetype" DROP NOT NULL;
ALTER TABLE "Profile" ALTER COLUMN "cognitiveBaseline" DROP NOT NULL;

-- Profile: M3 additions
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "displayName"         TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "answers"             TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "timezone"            TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "allowBenchmark"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "marketingEmails"     BOOLEAN NOT NULL DEFAULT true;

-- SimulationRecord: staleness flag + updatedAt
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "baselineStale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3);

-- Back-fill updatedAt for existing rows
UPDATE "SimulationRecord" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt non-nullable after back-fill
ALTER TABLE "SimulationRecord" ALTER COLUMN "updatedAt" SET NOT NULL;
