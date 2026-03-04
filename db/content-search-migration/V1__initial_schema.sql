CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS content_search;

CREATE TABLE content_search.external_content (
    id SERIAL PRIMARY KEY,
    external_id INTEGER NOT NULL,
    provider INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER,
    genre TEXT,
    poster_url TEXT,
    total_seasons INTEGER,
    total_episodes INTEGER,
    runtime_minutes INTEGER,
    suggested_type TEXT NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_external_content_provider_external_id
    ON content_search.external_content (provider, external_id);

CREATE INDEX ix_external_content_title
    ON content_search.external_content USING gin (title gin_trgm_ops);
