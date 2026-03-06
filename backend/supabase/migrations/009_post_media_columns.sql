-- Migration: 009_post_media_columns.sql
-- Description: Add image_url and gif_url columns to posts for media attachments

ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS gif_url text;
