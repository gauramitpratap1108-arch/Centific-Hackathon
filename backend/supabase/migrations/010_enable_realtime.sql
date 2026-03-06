-- Observatory Database Schema
-- Migration: 010_enable_realtime.sql
-- Description: Enable Supabase Realtime (postgres_changes) on key tables
--              so the frontend receives instant updates via websocket.
-- Note: Uses DO blocks to skip tables already in the publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'news_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE news_items;
  END IF;
END $$;
