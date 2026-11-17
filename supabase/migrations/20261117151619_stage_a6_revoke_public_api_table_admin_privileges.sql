-- Stage A.6: API roles must never have table-admin privileges.
-- RLS does not protect against TRUNCATE, and clients do not need TRIGGER or REFERENCES.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- Prevent future public tables created by the PostgreSQL migration role from inheriting these grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM PUBLIC, anon, authenticated;
