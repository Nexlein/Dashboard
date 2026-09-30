-- Additive, repeatable upgrade for databases created before stable GitHub identities.
-- No users, credentials or widget data are rewritten or deleted.
BEGIN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User" ("githubId");
COMMIT;
