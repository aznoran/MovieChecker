-- V12: Add rewatch_count column to watch_entries for tracking rewatches
ALTER TABLE watch_entries ADD COLUMN IF NOT EXISTS rewatch_count integer;
