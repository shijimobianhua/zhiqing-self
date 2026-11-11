CREATE TABLE IF NOT EXISTS zq_works (
 id uuid PRIMARY KEY, draft jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
 published jsonb, publication_version integer NOT NULL DEFAULT 0,
 public_slug text UNIQUE, first_published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS zq_media (
 id uuid PRIMARY KEY, upload_key uuid NOT NULL UNIQUE, sha256 text NOT NULL,
 mime text NOT NULL, original_name text NOT NULL, bytes integer NOT NULL,
 width integer NOT NULL, height integer NOT NULL, alt text NOT NULL,
 owner_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS zq_publications (
 id uuid PRIMARY KEY, work_id uuid NOT NULL REFERENCES zq_works(id),
 idempotency_key uuid NOT NULL UNIQUE, base_version integer NOT NULL,
 publication_version integer NOT NULL, status text NOT NULL DEFAULT 'pending',
 error text, committed_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz
);
CREATE TABLE IF NOT EXISTS zq_recovery (
 token_hash text PRIMARY KEY, owner_id text NOT NULL, expires_at timestamptz NOT NULL,
 used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS zq_audit (
 id bigserial PRIMARY KEY, action text NOT NULL, object_id text, result text NOT NULL,
 actor text, created_at timestamptz NOT NULL DEFAULT now()
);
