-- Raw TMDB search results (movies and TV combined)
CREATE TABLE content_search.tmdb_content (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER NOT NULL,
    media_type VARCHAR(10) NOT NULL, -- 'movie' or 'tv'
    title TEXT NOT NULL,
    original_title TEXT,
    original_language VARCHAR(10),
    overview TEXT,
    release_date VARCHAR(20),
    popularity DOUBLE PRECISION,
    vote_average DOUBLE PRECISION,
    vote_count INTEGER,
    adult BOOLEAN NOT NULL DEFAULT FALSE,
    video BOOLEAN NOT NULL DEFAULT FALSE,
    backdrop_path TEXT,
    poster_path TEXT,
    genre_ids JSONB,
    origin_country JSONB,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_tmdb_content_tmdb_id_media_type ON content_search.tmdb_content (tmdb_id, media_type);
CREATE INDEX ix_tmdb_content_title ON content_search.tmdb_content (title);

-- Raw AniList search results
CREATE TABLE content_search.anilist_content (
    id SERIAL PRIMARY KEY,
    anilist_id INTEGER NOT NULL,
    title_romaji TEXT,
    title_english TEXT,
    title_native TEXT,
    description TEXT,
    season_year INTEGER,
    season VARCHAR(20),
    format VARCHAR(20),
    status VARCHAR(30),
    episodes INTEGER,
    duration INTEGER,
    genres JSONB,
    tags JSONB,
    cover_image_large TEXT,
    cover_image_medium TEXT,
    cover_image_extra_large TEXT,
    banner_image TEXT,
    average_score INTEGER,
    mean_score INTEGER,
    popularity INTEGER,
    favourites INTEGER,
    start_date_year INTEGER,
    start_date_month INTEGER,
    start_date_day INTEGER,
    end_date_year INTEGER,
    end_date_month INTEGER,
    end_date_day INTEGER,
    source VARCHAR(30),
    country_of_origin VARCHAR(10),
    is_adult BOOLEAN NOT NULL DEFAULT FALSE,
    site_url TEXT,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_anilist_content_anilist_id ON content_search.anilist_content (anilist_id);
CREATE INDEX ix_anilist_content_title_english ON content_search.anilist_content (title_english);
