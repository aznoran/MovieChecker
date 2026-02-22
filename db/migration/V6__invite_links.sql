-- V6: Create invite_links table for time-limited invite links

CREATE TABLE IF NOT EXISTS invite_links (
    id SERIAL PRIMARY KEY,
    group_id integer NOT NULL,
    token varchar(64) NOT NULL,
    expires_at timestamp with time zone,
    max_uses integer,
    use_count integer NOT NULL DEFAULT 0,
    created_by_user_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT fk_invite_links_groups FOREIGN KEY (group_id)
        REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_links_users FOREIGN KEY (created_by_user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_invite_links_token ON invite_links (token);
