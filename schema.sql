-- Uniformity PostgreSQL schema
-- Target: PostgreSQL (Supabase-compatible). Run with psql or the Supabase SQL editor.
-- After applying, seed categories with: npm run db:seed

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users & auth ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  user_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text NOT NULL,
  password_hash          text NOT NULL,
  name                   text NOT NULL,
  year_level             text CHECK (year_level IN ('1st year', '2nd year', '3rd year', '4th year')),
  department             text CHECK (department IN ('CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION', 'ENTREPRENEURSHIP')),
  program                text,
  is_verified            boolean NOT NULL DEFAULT false,
  is_admin               boolean NOT NULL DEFAULT false,
  is_suspended           boolean NOT NULL DEFAULT false,
  contact_email          text,
  contact_mobile         text,
  contact_messenger      text,
  show_contact_details   boolean NOT NULL DEFAULT true,
  avatar_url             text,
  onboarding_completed_at timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower_unique UNIQUE (email)
);

-- Case-insensitive lookup is used throughout the app; keep a functional index too.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS email_verification_codes (
  code_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_user_idx
  ON email_verification_codes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_codes (
  code_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_codes_user_idx
  ON password_reset_codes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  family_id    uuid NOT NULL,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  replaced_by  uuid REFERENCES refresh_tokens(token_id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  ip_address   text,
  user_agent   text
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens (family_id);

-- Marketplace -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  category_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listings (
  listing_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(category_id),
  title        text NOT NULL,
  item_type    text NOT NULL CHECK (item_type IN ('Uniform', 'Equipment')),
  description  text NOT NULL,
  price        numeric(12, 2) NOT NULL CHECK (price >= 0),
  condition    text NOT NULL CHECK (condition IN ('Like New', 'Good', 'Fair')),
  size         text NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'N/A')),
  measurements text,
  department   text NOT NULL CHECK (department IN ('CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION', 'ENTREPRENEURSHIP')),
  status       text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Sold')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings (category_id);
CREATE INDEX IF NOT EXISTS listings_status_created_idx ON listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_department_idx ON listings (department);
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings (price);

CREATE TABLE IF NOT EXISTS listing_photos (
  photo_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  image_url     text NOT NULL,
  cloudinary_id text NOT NULL,
  position      integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS listing_photos_listing_idx ON listing_photos (listing_id, position);

CREATE TABLE IF NOT EXISTS comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES comments(comment_id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_listing_idx ON comments (listing_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);

CREATE TABLE IF NOT EXISTS wishlists (
  wishlist_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_user_listing_unique UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS wishlists_user_idx ON wishlists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wishlists_listing_idx ON wishlists (listing_id);

-- Chat ------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  seller_id       uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT chat_conversations_listing_buyer_unique UNIQUE (listing_id, buyer_id),
  CONSTRAINT chat_conversations_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS chat_conversations_buyer_idx ON chat_conversations (buyer_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS chat_conversations_seller_idx ON chat_conversations (seller_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS chat_conversations_listing_idx ON chat_conversations (listing_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  message_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  body            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz,
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON chat_messages (conversation_id, created_at DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx
  ON chat_messages (conversation_id, sender_id, read_at)
  WHERE read_at IS NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
  uploader_id   uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('image', 'video')),
  url           text NOT NULL,
  asset_key     text NOT NULL,
  content_type  text NOT NULL,
  file_name     text NOT NULL,
  file_size     integer NOT NULL CHECK (file_size >= 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_attachments_message_idx ON chat_attachments (message_id, created_at);

-- Notifications & push --------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN (
                    'comment', 'reply', 'message', 'wishlist',
                    'listing_removed', 'comment_removed', 'suspended', 'reinstated'
                  )),
  title           text NOT NULL,
  body            text,
  link_url        text,
  listing_id      uuid REFERENCES listings(listing_id) ON DELETE SET NULL,
  comment_id      uuid REFERENCES comments(comment_id) ON DELETE SET NULL,
  actor_id        uuid REFERENCES users(user_id) ON DELETE SET NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, read_at)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  subscription_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

COMMIT;
