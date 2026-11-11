-- Additive document family. Existing IDs, revisions and content are untouched.
ALTER TABLE zq_documents DROP CONSTRAINT IF EXISTS zq_documents_kind_check;
ALTER TABLE zq_documents ADD CONSTRAINT zq_documents_kind_check CHECK(kind IN ('home','about','now','settings','note','context'));
DROP INDEX IF EXISTS zq_singleton_kind;
CREATE UNIQUE INDEX zq_singleton_kind ON zq_documents(kind) WHERE kind NOT IN ('note','context');
CREATE UNIQUE INDEX IF NOT EXISTS zq_context_slug ON zq_documents(public_slug) WHERE kind='context';
ALTER TABLE zq_paths DROP CONSTRAINT IF EXISTS zq_paths_collection_check;
ALTER TABLE zq_paths ADD CONSTRAINT zq_paths_collection_check CHECK(collection IN ('works','notes','product-in-context'));
