-- V3: WatchEntryGroups junction table — many-to-many relationship between watch_entries and groups
-- Replaces entry duplication with a link table

CREATE TABLE IF NOT EXISTS watch_entry_groups (
    id SERIAL PRIMARY KEY,
    watch_entry_id integer NOT NULL,
    group_id integer NOT NULL,
    CONSTRAINT fk_watch_entry_groups_watch_entries FOREIGN KEY (watch_entry_id)
        REFERENCES watch_entries (id) ON DELETE CASCADE,
    CONSTRAINT fk_watch_entry_groups_groups FOREIGN KEY (group_id)
        REFERENCES groups (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_watch_entry_groups_watch_entry_id_group_id
    ON watch_entry_groups (watch_entry_id, group_id);

-- Populate junction table from existing entries that have a group_id
INSERT INTO watch_entry_groups (watch_entry_id, group_id)
SELECT we.id, we.group_id
FROM watch_entries we
WHERE we.group_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM watch_entry_groups weg
    WHERE weg.watch_entry_id = we.id AND weg.group_id = we.group_id
);
