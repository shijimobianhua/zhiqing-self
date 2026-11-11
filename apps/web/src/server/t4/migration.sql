-- Additive only. The T3 work rows and auth baseline remain intact.
ALTER TABLE zq_works ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'active';
ALTER TABLE zq_works ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE zq_documents (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('home','about','now','settings','note')),
 draft jsonb NOT NULL, version integer NOT NULL DEFAULT 1, published jsonb,
 publication_version integer NOT NULL DEFAULT 0, public_slug text,
 first_published_at timestamptz, lifecycle text NOT NULL DEFAULT 'active', deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX zq_singleton_kind ON zq_documents(kind) WHERE kind <> 'note';
CREATE UNIQUE INDEX zq_note_slug ON zq_documents(public_slug) WHERE kind='note';
CREATE TABLE zq_history (
 id uuid PRIMARY KEY, object_id uuid NOT NULL, kind text NOT NULL, version integer NOT NULL,
 draft jsonb NOT NULL, action text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(object_id,version)
);
CREATE TABLE zq_operations (
 id uuid PRIMARY KEY, object_id uuid NOT NULL, kind text NOT NULL, action text NOT NULL,
 idempotency_key uuid NOT NULL UNIQUE, base_version integer NOT NULL, publication_version integer NOT NULL,
 status text NOT NULL DEFAULT 'pending', error text, paths jsonb NOT NULL DEFAULT '[]',
 committed_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz
);
CREATE TABLE zq_paths (
 collection text NOT NULL CHECK(collection IN ('works','notes')), slug text NOT NULL,
 object_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(collection,slug)
);
INSERT INTO zq_paths(collection,slug,object_id) SELECT 'works',public_slug,id FROM zq_works WHERE public_slug IS NOT NULL;
INSERT INTO zq_history(id,object_id,kind,version,draft,action,actor)
 SELECT gen_random_uuid(),id,'work',version,draft,'T3 baseline','migration' FROM zq_works;
ALTER TABLE zq_media ADD COLUMN caption text NOT NULL DEFAULT '';
ALTER TABLE zq_media ADD COLUMN focal_x integer NOT NULL DEFAULT 50;
ALTER TABLE zq_media ADD COLUMN focal_y integer NOT NULL DEFAULT 50;
ALTER TABLE zq_media ADD COLUMN metadata_version integer NOT NULL DEFAULT 1;
ALTER TABLE zq_media ADD COLUMN delete_after timestamptz;
CREATE TABLE zq_maintenance (
 id uuid PRIMARY KEY, kind text NOT NULL, state text NOT NULL, summary jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW zq_content AS
 SELECT id,'work'::text AS kind,draft,version,published,publication_version,public_slug,first_published_at,lifecycle,deleted_at,created_at,updated_at FROM zq_works
 UNION ALL
 SELECT id,kind,draft,version,published,publication_version,public_slug,first_published_at,lifecycle,deleted_at,created_at,updated_at FROM zq_documents;
