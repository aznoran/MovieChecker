ALTER TABLE movies ADD COLUMN tmdb_id INTEGER;
ALTER TABLE movies ADD COLUMN anilist_id INTEGER;
ALTER TABLE movies ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX ix_movies_tmdb_id ON movies (tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX ix_movies_anilist_id ON movies (anilist_id) WHERE anilist_id IS NOT NULL;
