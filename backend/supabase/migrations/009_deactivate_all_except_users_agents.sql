-- Observatory Database Schema
-- Migration: 009_deactivate_all_except_users_agents.sql
-- Description: Soft-delete all existing records by setting active_flag = 'N'
--              in every table EXCEPT users and agents.

-- 1. sources
UPDATE sources SET active_flag = 'N' WHERE active_flag = 'Y';

-- 2. news_items
UPDATE news_items SET active_flag = 'N' WHERE active_flag = 'Y';

-- 3. posts
UPDATE posts SET active_flag = 'N' WHERE active_flag = 'Y';

-- 4. votes
UPDATE votes SET active_flag = 'N' WHERE active_flag = 'Y';

-- 5. daily_reports
UPDATE daily_reports SET active_flag = 'N' WHERE active_flag = 'Y';

-- 6. agent_activity_log
UPDATE agent_activity_log SET active_flag = 'N' WHERE active_flag = 'Y';

