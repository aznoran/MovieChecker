-- V1: Initial schema — movies, users, groups, group_members, watch_entries, entry_ratings, poster_images, user_settings
-- Converted from EF Core migration 20260201150328_initi
-- Uses IF NOT EXISTS for production safety

-- movies
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title text NOT NULL,
    description text,
    type integer NOT NULL,
    year integer,
    genre text,
    poster_url text,
    created_at timestamp with time zone NOT NULL
);

-- poster_images
CREATE TABLE IF NOT EXISTS poster_images (
    id SERIAL PRIMARY KEY,
    file_name text NOT NULL,
    content_type text NOT NULL,
    data bytea NOT NULL,
    created_at timestamp with time zone NOT NULL
);

-- users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

-- groups
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    invite_code text NOT NULL,
    created_by_user_id integer NOT NULL,
    is_private boolean NOT NULL,
    password_hash text,
    default_role integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_groups_users_created_by_user_id FOREIGN KEY (created_by_user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL,
    prevent_others_adding_to_my_personal boolean NOT NULL,
    prevent_me_adding_to_my_personal boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_user_settings_users_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- group_members
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    role integer NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_group_members_groups_group_id FOREIGN KEY (group_id)
        REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_members_users_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- watch_entries
CREATE TABLE IF NOT EXISTS watch_entries (
    id SERIAL PRIMARY KEY,
    movie_id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer,
    status integer NOT NULL,
    my_rating integer,
    partner_rating integer,
    emotion integer,
    comment text,
    private_comment text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    current_season integer,
    current_episode integer,
    total_episodes integer,
    watching_time integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_watch_entries_groups_group_id FOREIGN KEY (group_id)
        REFERENCES groups (id) ON DELETE SET NULL,
    CONSTRAINT fk_watch_entries_movies_movie_id FOREIGN KEY (movie_id)
        REFERENCES movies (id) ON DELETE CASCADE,
    CONSTRAINT fk_watch_entries_users_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- entry_ratings
CREATE TABLE IF NOT EXISTS entry_ratings (
    id SERIAL PRIMARY KEY,
    watch_entry_id integer NOT NULL,
    user_id integer NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_entry_ratings_users_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_entry_ratings_watch_entries_watch_entry_id FOREIGN KEY (watch_entry_id)
        REFERENCES watch_entries (id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_groups_created_by_user_id ON groups (created_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_groups_invite_code ON groups (invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_settings_user_id ON user_settings (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_group_members_group_id_user_id ON group_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS ix_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS ix_watch_entries_group_id ON watch_entries (group_id);
CREATE INDEX IF NOT EXISTS ix_watch_entries_movie_id ON watch_entries (movie_id);
CREATE INDEX IF NOT EXISTS ix_watch_entries_user_id ON watch_entries (user_id);
CREATE INDEX IF NOT EXISTS ix_entry_ratings_user_id ON entry_ratings (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_entry_ratings_watch_entry_id_user_id ON entry_ratings (watch_entry_id, user_id);
