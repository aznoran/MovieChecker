-- V5: Remove emotion column from watch_entries table

ALTER TABLE watch_entries DROP COLUMN IF EXISTS emotion;
