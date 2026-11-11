-- Payload 3.92.0 auth schema; PostgreSQL 17.11; structure only, no records.
CREATE TABLE auth.payload_kv (
    id integer NOT NULL,
    key character varying NOT NULL,
    data jsonb NOT NULL
);



CREATE SEQUENCE auth.payload_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_kv_id_seq OWNED BY auth.payload_kv.id;



CREATE TABLE auth.payload_locked_documents (
    id integer NOT NULL,
    global_slug character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);



CREATE SEQUENCE auth.payload_locked_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_locked_documents_id_seq OWNED BY auth.payload_locked_documents.id;



CREATE TABLE auth.payload_locked_documents_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer
);



CREATE SEQUENCE auth.payload_locked_documents_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_locked_documents_rels_id_seq OWNED BY auth.payload_locked_documents_rels.id;



CREATE TABLE auth.payload_migrations (
    id integer NOT NULL,
    name character varying,
    batch numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);



CREATE SEQUENCE auth.payload_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_migrations_id_seq OWNED BY auth.payload_migrations.id;



CREATE TABLE auth.payload_preferences (
    id integer NOT NULL,
    key character varying,
    value jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);



CREATE SEQUENCE auth.payload_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_preferences_id_seq OWNED BY auth.payload_preferences.id;



CREATE TABLE auth.payload_preferences_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer
);



CREATE SEQUENCE auth.payload_preferences_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.payload_preferences_rels_id_seq OWNED BY auth.payload_preferences_rels.id;



CREATE TABLE auth.users (
    id integer NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    reset_password_requested_at timestamp(3) with time zone,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);



CREATE SEQUENCE auth.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE auth.users_id_seq OWNED BY auth.users.id;



CREATE TABLE auth.users_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);



ALTER TABLE ONLY auth.payload_kv ALTER COLUMN id SET DEFAULT nextval('auth.payload_kv_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_locked_documents ALTER COLUMN id SET DEFAULT nextval('auth.payload_locked_documents_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_locked_documents_rels ALTER COLUMN id SET DEFAULT nextval('auth.payload_locked_documents_rels_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_migrations ALTER COLUMN id SET DEFAULT nextval('auth.payload_migrations_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_preferences ALTER COLUMN id SET DEFAULT nextval('auth.payload_preferences_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_preferences_rels ALTER COLUMN id SET DEFAULT nextval('auth.payload_preferences_rels_id_seq'::regclass);



ALTER TABLE ONLY auth.users ALTER COLUMN id SET DEFAULT nextval('auth.users_id_seq'::regclass);



ALTER TABLE ONLY auth.payload_kv
    ADD CONSTRAINT payload_kv_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.payload_locked_documents
    ADD CONSTRAINT payload_locked_documents_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.payload_migrations
    ADD CONSTRAINT payload_migrations_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.payload_preferences
    ADD CONSTRAINT payload_preferences_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);



ALTER TABLE ONLY auth.users_sessions
    ADD CONSTRAINT users_sessions_pkey PRIMARY KEY (id);



CREATE UNIQUE INDEX payload_kv_key_idx ON auth.payload_kv USING btree (key);



CREATE INDEX payload_locked_documents_created_at_idx ON auth.payload_locked_documents USING btree (created_at);



CREATE INDEX payload_locked_documents_global_slug_idx ON auth.payload_locked_documents USING btree (global_slug);



CREATE INDEX payload_locked_documents_rels_order_idx ON auth.payload_locked_documents_rels USING btree ("order");



CREATE INDEX payload_locked_documents_rels_parent_idx ON auth.payload_locked_documents_rels USING btree (parent_id);



CREATE INDEX payload_locked_documents_rels_path_idx ON auth.payload_locked_documents_rels USING btree (path);



CREATE INDEX payload_locked_documents_rels_users_id_idx ON auth.payload_locked_documents_rels USING btree (users_id);



CREATE INDEX payload_locked_documents_updated_at_idx ON auth.payload_locked_documents USING btree (updated_at);



CREATE INDEX payload_migrations_created_at_idx ON auth.payload_migrations USING btree (created_at);



CREATE INDEX payload_migrations_updated_at_idx ON auth.payload_migrations USING btree (updated_at);



CREATE INDEX payload_preferences_created_at_idx ON auth.payload_preferences USING btree (created_at);



CREATE INDEX payload_preferences_key_idx ON auth.payload_preferences USING btree (key);



CREATE INDEX payload_preferences_rels_order_idx ON auth.payload_preferences_rels USING btree ("order");



CREATE INDEX payload_preferences_rels_parent_idx ON auth.payload_preferences_rels USING btree (parent_id);



CREATE INDEX payload_preferences_rels_path_idx ON auth.payload_preferences_rels USING btree (path);



CREATE INDEX payload_preferences_rels_users_id_idx ON auth.payload_preferences_rels USING btree (users_id);



CREATE INDEX payload_preferences_updated_at_idx ON auth.payload_preferences USING btree (updated_at);



CREATE INDEX users_created_at_idx ON auth.users USING btree (created_at);



CREATE UNIQUE INDEX users_email_idx ON auth.users USING btree (email);



CREATE INDEX users_sessions_order_idx ON auth.users_sessions USING btree (_order);



CREATE INDEX users_sessions_parent_id_idx ON auth.users_sessions USING btree (_parent_id);



CREATE INDEX users_updated_at_idx ON auth.users USING btree (updated_at);



ALTER TABLE ONLY auth.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES auth.payload_locked_documents(id) ON DELETE CASCADE;



ALTER TABLE ONLY auth.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_users_fk FOREIGN KEY (users_id) REFERENCES auth.users(id) ON DELETE CASCADE;



ALTER TABLE ONLY auth.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES auth.payload_preferences(id) ON DELETE CASCADE;



ALTER TABLE ONLY auth.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_users_fk FOREIGN KEY (users_id) REFERENCES auth.users(id) ON DELETE CASCADE;



ALTER TABLE ONLY auth.users_sessions
    ADD CONSTRAINT users_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES auth.users(id) ON DELETE CASCADE;
