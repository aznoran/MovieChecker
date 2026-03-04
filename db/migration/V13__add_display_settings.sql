ALTER TABLE user_settings
    ADD COLUMN card_size VARCHAR(10) DEFAULT 'medium',
    ADD COLUMN has_seen_translate_hint BOOLEAN NOT NULL DEFAULT FALSE;
