-- The duo itself. These are reference data rather than user content: the business has
-- exactly these two allocatable DJs, and every availability answer depends on them
-- existing.
INSERT INTO resource (key, kind, label) VALUES
  ('dj-1', 'dj', '{"bg": "DJ 1", "en": "DJ 1"}'),
  ('dj-2', 'dj', '{"bg": "DJ 2", "en": "DJ 2"}')
ON CONFLICT (key) DO NOTHING;
