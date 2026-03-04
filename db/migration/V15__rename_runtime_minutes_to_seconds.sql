-- Rename runtime_minutes to runtime_seconds and convert existing data from minutes to seconds
ALTER TABLE watch_entries RENAME COLUMN runtime_minutes TO runtime_seconds;
UPDATE watch_entries SET runtime_seconds = runtime_seconds * 60 WHERE runtime_seconds IS NOT NULL;
