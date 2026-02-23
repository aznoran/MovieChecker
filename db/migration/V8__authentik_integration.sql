-- V8: Authentik SSO integration
-- Add authentik_id column for mapping Authentik users to local users
-- Make password_hash nullable since Authentik manages authentication

ALTER TABLE users ADD COLUMN IF NOT EXISTS authentik_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_authentik_id ON users (authentik_id) WHERE authentik_id IS NOT NULL;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
