-- V4: Permission system — per-member custom permissions beyond role defaults

CREATE TABLE IF NOT EXISTS member_permissions (
    id SERIAL PRIMARY KEY,
    group_member_id integer NOT NULL UNIQUE,
    granted_permissions integer NOT NULL DEFAULT 0,
    revoked_permissions integer NOT NULL DEFAULT 0,
    CONSTRAINT fk_member_permissions_group_members FOREIGN KEY (group_member_id)
        REFERENCES group_members (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_member_permissions_group_member_id
    ON member_permissions (group_member_id);
