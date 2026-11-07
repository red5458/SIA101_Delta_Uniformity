-- ---------------------------------------------------------------------------
-- Uniformity: plain PostgreSQL schema.
--
-- This replaces the earlier hosted-backend migration set:
--   * credentials live in public.users (password_hash) instead of auth.users
--   * email_verification_codes replaces the hosted OTP store
--   * refresh_tokens adds rotating, revocable refresh sessions
--   * RLS grants are gone; authorization is enforced in the Express service
--     layer because the database is never exposed to clients
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  year_level text,
  department text,
  program text,
  is_verified boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  contact_email text,
  contact_mobile text,
  contact_messenger text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_domain_chk
    CHECK (email ~* '^[A-Za-z0-9._%+\-]+@bicol-u\.edu\.ph$'),
  CONSTRAINT users_name_len_chk
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  CONSTRAINT users_year_level_chk
    CHECK (year_level IS NULL OR year_level IN ('1st year', '2nd year', '3rd year', '4th year')),
  CONSTRAINT users_department_chk
    CHECK (department IS NULL OR department IN ('CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION')),
  CONSTRAINT users_program_len_chk
    CHECK (program IS NULL OR char_length(btrim(program)) BETWEEN 2 AND 20)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_department_idx ON users (department);
CREATE INDEX IF NOT EXISTS users_program_idx ON users (program);

-- ---------------------------------------------------------------------------
-- Email OTP codes. Only a keyed hash is stored; the plain code lives only in
-- the student's inbox.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_codes (
  code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_user_idx
  ON email_verification_codes (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Refresh sessions. Tokens are opaque random strings; only SHA-256 hashes are
-- persisted. family_id groups a rotation chain so a replayed token revokes the
-- whole chain.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by uuid REFERENCES refresh_tokens(token_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens (family_id);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  category_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  listing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  category_id uuid NOT NULL,
  title text NOT NULL,
  item_type text NOT NULL,
  description text NOT NULL,
  price numeric(10, 2) NOT NULL,
  condition text NOT NULL,
  size text NOT NULL DEFAULT 'N/A',
  measurements text,
  department text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT listings_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
  CONSTRAINT listings_title_len_chk
    CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  CONSTRAINT listings_description_len_chk
    CHECK (char_length(btrim(description)) BETWEEN 10 AND 5000),
  CONSTRAINT listings_item_type_chk
    CHECK (item_type IN ('Uniform', 'Equipment')),
  CONSTRAINT listings_price_chk
    CHECK (price >= 0 AND price <= 100000),
  CONSTRAINT listings_condition_chk
    CHECK (condition IN ('Like New', 'Good', 'Fair')),
  CONSTRAINT listings_size_chk
    CHECK (size IN ('S', 'M', 'L', 'XL', 'N/A')),
  CONSTRAINT listings_department_chk
    CHECK (department IN ('CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION')),
  CONSTRAINT listings_status_chk
    CHECK (status IN ('Active', 'Sold')),
  CONSTRAINT listings_measurements_len_chk
    CHECK (measurements IS NULL OR char_length(measurements) <= 200)
);

CREATE INDEX IF NOT EXISTS listings_active_feed_idx
  ON listings (created_at DESC)
  WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings (seller_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings (category_id);
CREATE INDEX IF NOT EXISTS listings_department_idx ON listings (department);
CREATE INDEX IF NOT EXISTS listings_size_idx ON listings (size);
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings (price);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings (status);

-- ---------------------------------------------------------------------------
-- Listing photos. cloudinary_id is the Cloudinary public_id; image_url is the
-- secure delivery URL. Both are returned by the signed direct upload.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_photos (
  photo_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  image_url text NOT NULL,
  cloudinary_id text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_photos_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
  CONSTRAINT listing_photos_position_chk
    CHECK (position >= 0 AND position <= 9),
  CONSTRAINT listing_photos_listing_position_key
    UNIQUE (listing_id, position)
);
CREATE INDEX IF NOT EXISTS listing_photos_listing_idx
  ON listing_photos (listing_id, position);

-- ---------------------------------------------------------------------------
-- Wishlists (bookmarks replace the cart)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
  wishlist_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT wishlists_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
  CONSTRAINT wishlists_user_listing_key UNIQUE (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS wishlists_user_idx ON wishlists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wishlists_listing_idx ON wishlists (listing_id);

-- ---------------------------------------------------------------------------
-- Public Q&A comments (one level of replies via parent_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
  CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT comments_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
  CONSTRAINT comments_text_len_chk
    CHECK (char_length(btrim(text)) BETWEEN 1 AND 1000)
);
CREATE INDEX IF NOT EXISTS comments_listing_idx
  ON comments (listing_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS listings_set_updated_at ON listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS comments_set_updated_at ON comments;
CREATE TRIGGER comments_set_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A reply must belong to the same listing as its parent.
CREATE OR REPLACE FUNCTION validate_comment_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_listing uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT listing_id INTO parent_listing
  FROM comments
  WHERE comment_id = NEW.parent_id;

  IF parent_listing IS NULL OR parent_listing <> NEW.listing_id THEN
    RAISE EXCEPTION 'parent comment must belong to the same listing'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_validate_parent ON comments;
CREATE TRIGGER comments_validate_parent
  BEFORE INSERT OR UPDATE OF parent_id, listing_id ON comments
  FOR EACH ROW EXECUTE FUNCTION validate_comment_parent();

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
INSERT INTO categories (name, slug, display_order, description)
VALUES
  ('Standard Uniform', 'standard-uniform', 1, 'Daily uniform sets and pieces'),
  ('PE Uniform', 'pe-uniform', 2, 'Physical education uniforms'),
  ('Department Shirt', 'department-shirt', 3, 'College and program shirts'),
  ('Course Equipment', 'course-equipment', 4, 'Calculators, breadboards, lab and engineering gear'),
  ('Accessories', 'accessories', 5, 'IDs, lanyards, patches, and other add-ons')
ON CONFLICT (slug) DO NOTHING;
