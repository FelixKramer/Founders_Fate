-- M6: Simulation run proxy additions
-- Add decisionOptionId, archetype, seed to SimulationRecord.
-- Add code (share link token) to Share.

-- SimulationRecord: optional decision option identifier
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "decisionOptionId" TEXT;

-- SimulationRecord: archetype used for this specific run
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "archetype" TEXT;

-- SimulationRecord: HMAC-derived simulation seed
ALTER TABLE "SimulationRecord" ADD COLUMN IF NOT EXISTS "seed" TEXT;

-- Share: url-safe 8-char share code (must be unique)
ALTER TABLE "Share" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Back-fill existing Share rows with a random placeholder so we can enforce NOT NULL + UNIQUE
UPDATE "Share" SET "code" = encode(gen_random_bytes(6), 'base64url') WHERE "code" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "Share" ALTER COLUMN "code" SET NOT NULL;

-- Add unique index on Share.code
CREATE UNIQUE INDEX IF NOT EXISTS "Share_code_key" ON "Share"("code");

-- Index to speed up share lookups by code
CREATE INDEX IF NOT EXISTS "Share_code_idx" ON "Share"("code");
