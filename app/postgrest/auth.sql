-- ============================================
-- PostgREST JWT Authentication Setup
-- ============================================
-- Creates the authenticator role and JWT helper functions
-- that PostgREST uses to authenticate requests.

-- The authenticator role that PostgREST switches to
CREATE ROLE authenticator NOINHERIT LOGIN;

-- Anonymous role (for public endpoints)
CREATE ROLE anon NOINHERIT;
GRANT anon TO authenticator;

-- Authenticated user role
CREATE ROLE app_user NOINHERIT;
GRANT app_user TO authenticator;

-- Service role (for backend/webhook operations)
CREATE ROLE service_role NOINHERIT;
GRANT service_role TO authenticator;

-- Grant table permissions to anon (limited public access)
GRANT SELECT ON users TO anon;

-- Grant full permissions to app_user on their own data (RLS handles scope)
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON todos TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO app_user;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Grant full permissions to service_role (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- Helper function to extract user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub';
$$ LANGUAGE SQL STABLE;

-- Helper function to extract role from JWT
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role';
$$ LANGUAGE SQL STABLE;

-- Helper to generate JWT tokens (called from NextAuth callback)
-- Note: In production, JWT signing happens in Next.js using the secret key
-- This function is for reference/testing
CREATE OR REPLACE FUNCTION auth.sign_token(p_user_id UUID, p_role TEXT DEFAULT 'app_user')
RETURNS TEXT AS $$
  SELECT sign(
    json_build_object(
      'sub', p_user_id,
      'role', p_role,
      'iss', 'launchpad',
      'exp', EXTRACT(EPOCH FROM NOW() + INTERVAL '24 hours')
    ),
    current_setting('app.jwt_secret')
  );
$$ LANGUAGE SQL;
