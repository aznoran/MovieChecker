-- Add authentik_id column to users table for linking with Authentik IDP
ALTER TABLE users ADD COLUMN authentik_id VARCHAR(255) NULL;
CREATE UNIQUE INDEX ix_users_authentik_id ON users (authentik_id) WHERE authentik_id IS NOT NULL;

-- Make password_hash nullable since Authentik-managed users won't have local passwords
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
