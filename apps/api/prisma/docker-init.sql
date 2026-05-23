-- Initialize pedi_ai database (idempotent - safe to re-run)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pedi_ai') THEN
        CREATE DATABASE pedi_ai;
    END IF;
END $$;
