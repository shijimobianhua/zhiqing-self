-- Additive only: public internet approval is separate from old local test publication.
CREATE TABLE zq_site_release_approvals (
  content_id uuid PRIMARY KEY,
  publication_version integer NOT NULL CHECK (publication_version > 0),
  approved_at timestamptz NOT NULL DEFAULT now()
);
