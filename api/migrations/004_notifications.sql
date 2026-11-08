-- ---------------------------------------------------------------------------
-- In-app notifications (bell + /notifications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  listing_id uuid,
  comment_id uuid,
  actor_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT notifications_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE SET NULL,
  CONSTRAINT notifications_comment_id_fkey
    FOREIGN KEY (comment_id) REFERENCES comments(comment_id) ON DELETE SET NULL,
  CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT notifications_type_chk
    CHECK (type IN (
      'comment',
      'reply',
      'listing_removed',
      'comment_removed',
      'suspended',
      'reinstated'
    )),
  CONSTRAINT notifications_title_len_chk
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 160)
);
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id)
  WHERE read_at IS NULL;
