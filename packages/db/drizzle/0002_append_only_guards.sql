-- ADR-001: evidence_events and xp_ledger are append-only. Scores are projections, so nothing may
-- rewrite history; the database enforces it, not just the application.
CREATE OR REPLACE FUNCTION careerforge_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (ADR-001): % rejected', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evidence_events_append_only BEFORE UPDATE OR DELETE ON "evidence_events"
  FOR EACH ROW EXECUTE FUNCTION careerforge_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER xp_ledger_append_only BEFORE UPDATE OR DELETE ON "xp_ledger"
  FOR EACH ROW EXECUTE FUNCTION careerforge_reject_mutation();
