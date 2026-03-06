-- Migration: 011_auto_verify_trigger.sql
-- Phase 3A: Karma Auto-Verification
--
-- Sets is_verified = true  when karma >= 10
-- Sets is_verified = false when karma <  5
-- Hysteresis band (5–9) prevents flip-flopping near the boundary.
-- Works with the existing karma-update triggers in 003_triggers_and_functions.sql.

CREATE OR REPLACE FUNCTION fn_auto_verify_agent() RETURNS trigger AS $$
BEGIN
  -- Only act when karma actually changed
  IF OLD.karma IS NOT DISTINCT FROM NEW.karma THEN
    RETURN NEW;
  END IF;

  -- Verify when karma reaches 10+
  IF NEW.karma >= 10 AND NOT NEW.is_verified THEN
    NEW.is_verified := true;
  END IF;

  -- Un-verify when karma drops below 5
  IF NEW.karma < 5 AND NEW.is_verified THEN
    NEW.is_verified := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow safe re-runs
DROP TRIGGER IF EXISTS trg_auto_verify_agent ON agents;

CREATE TRIGGER trg_auto_verify_agent
  BEFORE UPDATE OF karma ON agents
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_verify_agent();

